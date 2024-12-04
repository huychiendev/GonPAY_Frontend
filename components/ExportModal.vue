<template>
  <AModal
    :visible="visible"
    title="Xuất báo cáo"
    @update:visible="$emit('update:visible', $event)"
    @ok="handleExport"
    :confirmLoading="exporting"
  >
    <div class="space-y-4">
      <div>
        <div class="mb-2">Định dạng file</div>
        <ARadioGroup v-model:value="format">
          <ARadio value="xlsx">Excel (.xlsx)</ARadio>
          <ARadio value="pdf">PDF (.pdf)</ARadio>
          <ARadio value="csv">CSV (.csv)</ARadio>
        </ARadioGroup>
      </div>

      <div>
        <div class="mb-2">Dữ liệu xuất</div>
        <ACheckboxGroup v-model:value="selectedFields">
          <div v-for="field in availableFields" :key="field.key" class="mb-2">
            <ACheckbox :value="field.key">{{ field.label }}</ACheckbox>
          </div>
        </ACheckboxGroup>
      </div>
      
      <div>
        <div class="mb-2">Tên file</div>
        <AInput v-model:value="filename" placeholder="Nhập tên file..." />
      </div>
    </div>
  </AModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { ExportService } from '~/services/exportService'

interface Props {
  visible: boolean
  data: any[]
  columns: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'success'])

const format = ref('xlsx')
const filename = ref('')
const exporting = ref(false)
const selectedFields = ref<string[]>(['transaction_id', 'type', 'amount', 'status', 'created_at'])

const availableFields = computed(() =>
  props.columns?.map(col => ({
    key: col.key,
    label: col.title
  })) || []
)

const handleExport = async () => {
  if (!selectedFields.value.length) {
    message.warning('Vui lòng chọn ít nhất một trường dữ liệu để xuất')
    return
  }

  try {
    exporting.value = true

    const formattedData = props.data.map(item => {
      const formatted: Record<string, any> = {}
      selectedFields.value.forEach(field => {
        const column = props.columns.find(col => col.key === field)
        let value = item[field]

        if (field === 'amount') {
          value = formatCurrency(value)
        } else if (field === 'created_at') {
          value = formatDate(value)
        } else if (field === 'status') {
          value = formatStatus(value)
        }

        formatted[column?.title || field] = value
      })
      return formatted
    })

    const exportFilename = filename.value || `transactions-${new Date().getTime()}`

    switch (format.value) {
      case 'xlsx':
        await ExportService.exportToExcel(formattedData, exportFilename)
        break
      case 'pdf':
        await ExportService.exportToPDF(
          formattedData,
          props.columns.filter(col => selectedFields.value.includes(col.key)),
          exportFilename
        )
        break
      case 'csv':
        await ExportService.exportToCSV(formattedData, exportFilename)
        break
    }

    message.success('Xuất báo cáo thành công')
    emit('success')
    emit('update:visible', false)
  } catch (error) {
    message.error('Có lỗi khi xuất báo cáo: ' + (error as Error).message)
  } finally {
    exporting.value = false
  }
}

const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    COMPLETED: 'Thành công',
    PENDING: 'Đang xử lý',
    FAILED: 'Thất bại',
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Đã khóa'
  }
  return statusMap[status] || status
}
</script>
