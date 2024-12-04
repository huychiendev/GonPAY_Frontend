import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from '~/utils/format'

export class ExportService {
  // Xuất file Excel
  static async exportToExcel(data: any[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    // Tùy chỉnh style cho header
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2F80ED" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    }
    
    // Tùy chỉnh style cho các ô dữ liệu
    const cellStyle = {
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    }
    
    // Áp dụng style cho header
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
      worksheet[cellRef].s = headerStyle
    }
    
    // Áp dụng style cho các ô dữ liệu
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = cellStyle
        }
      }
    }
    
    // Tự động điều chỉnh độ rộng cột
    const maxWidth = 50
    const colWidths = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxLength = 10 // Độ rộng tối thiểu
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        if (worksheet[cellRef]) {
          const cellValue = worksheet[cellRef].v.toString()
          maxLength = Math.min(Math.max(maxLength, cellValue.length), maxWidth)
        }
      }
      colWidths.push({ wch: maxLength })
    }
    worksheet['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
    
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      cellStyles: true
    })
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    saveAs(blob, `${filename}.xlsx`)
  }

  // Xuất file PDF 
  static async exportToPDF(data: any[], columns: any[], filename: string) {
    // Khởi tạo PDF với orientation landscape
    const doc = new jsPDF('landscape')
    
    // Thêm font Times New Roman để hỗ trợ tiếng Việt
    doc.addFont('Times-Roman', 'Times', 'normal')
    doc.setFont('Times')

    // Thêm header với encoding
    doc.setFontSize(20)
    doc.setTextColor(44, 62, 80)
    const title = 'BÁO CÁO GIAO DỊCH'
    const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor
    const pageWidth = doc.internal.pageSize.getWidth()
    const titleX = (pageWidth - titleWidth) / 2
    doc.text(title, titleX, 20)

    // Thêm thông tin báo cáo
    doc.setFontSize(11)
    doc.setTextColor(52, 73, 94)
    doc.text(`Ngày xuất: ${formatDate(new Date())}`, 14, 30)
    doc.text(`Tổng số giao dịch: ${data.length}`, 14, 37)
    doc.text(`Tổng giá trị: ${formatCurrency(data.reduce((sum, item) => sum + (item.amount || 0), 0))}`, 14, 44)

    // Tạo bảng với font Times New Roman
    doc.autoTable({
      startY: 55,
      head: [columns.map(col => col.title)],
      body: data.map(item => 
        columns.map(col => {
          if (col.key === 'amount') return formatCurrency(item[col.key])
          if (col.key === 'created_at') return formatDate(item[col.key])
          if (col.key === 'status') return this.formatStatus(item[col.key])
          return item[col.key]
        })
      ),
      styles: {
        font: 'Times',
        fontSize: 10,
        cellPadding: 6
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Mã giao dịch
        1: { cellWidth: 25 }, // Loại
        2: { cellWidth: 35, halign: 'right' }, // Số tiền
        3: { cellWidth: 25, halign: 'center' }, // Trạng thái
        4: { cellWidth: 35 } // Thời gian
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249]
      },
      margin: { top: 55, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Header cho các trang tiếp
        if (data.pageNumber > 1) {
          doc.text('BÁO CÁO GIAO DỊCH (tiếp theo)', titleX, 20)
        }
        
        // Footer
        const str = `Trang ${data.pageNumber}`
        doc.setFontSize(10)
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10)
      }
    })

    doc.save(`${filename}.pdf`)
  }

  // Xuất file CSV
  static async exportToCSV(data: any[], filename: string) {
    const csvContent = this.convertToCSV(data)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${filename}.csv`)
  }

  private static convertToCSV(data: any[]): string {
    const header = Object.keys(data[0])
    const rows = data.map(item => header.map(key => item[key]))
    return [
      header.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  private static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      COMPLETED: 'Thành công',
      PENDING: 'Đang xử lý',
      FAILED: 'Thất bại'
    }
    return statusMap[status] || status
  }
} 