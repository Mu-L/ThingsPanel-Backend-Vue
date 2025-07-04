<script setup lang="ts">
import { defineProps, onMounted, reactive, ref } from 'vue'
import { useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import { addMonths } from 'date-fns'
import { telemetryHistoryData } from '@/service/api'
import { $t } from '@/locales'
import { getBaseServerUrl } from '@/utils/common/tool'
import { useLoading } from '~/packages/hooks'

interface Created {
  deviceId: string
  theKey: string
}

const props = defineProps<Created>()
const baseURL = getBaseServerUrl()
interface Params {
  device_id: string
  end_time: number
  start_time: number
  export_excel: boolean
  key: string
  page: number
  page_size: number
}

interface HistoryData {
  key: string
  ts: string
  value: number
}
const { loading, startLoading, endLoading } = useLoading()

// 获取当前具体时间的毫秒数
const end_time = dayjs().endOf('day').valueOf()

// 获取上一天当前时刻的毫秒数
const start_time = dayjs().subtract(1, 'day').startOf('day').valueOf()
const params = reactive<Params>({
  device_id: props.deviceId,
  end_time,
  start_time,
  export_excel: false,
  key: props.theKey,
  page: 1,
  page_size: 5
})

const tableData = ref<HistoryData[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 5,
  showSizePicker: true,
  pageSizes: [5, 10, 15, 20],
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page
    params.page = page
    getTelemetryHistoryData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    params.page_size = pageSize
    params.page = 1
    getTelemetryHistoryData()
  }
})

// 定义函数
const getTelemetryHistoryData = async () => {
  if (!props.deviceId && !props.theKey) {
    tableData.value = []
    return
  }
  startLoading()
  const { data, error } = await telemetryHistoryData(params)

  if (params.export_excel) {
    endLoading()
    if (data?.filePath) {
      const baseUrlWithoutApi = baseURL.replace('/api/v1', '/')
      const downloadUrl = `${baseUrlWithoutApi}${data.filePath}`
      window.open(downloadUrl)
    }
  }

  if (!error && !params.export_excel) {
    tableData.value = data.list || []
    pagination.itemCount = data.total || 0
    endLoading()
  }
}

const message = useMessage()

// 然后定义变量
const dateRange = ref<[number, number] | null>([params.start_time, params.end_time])

// 修复类型实例化过深的问题
const columns = [
  {
    title: $t('common.time'),
    key: 'time',
    render: (row: HistoryData) => dayjs(row.ts).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: $t('device_template.table_header.dataIdentifier'),
    key: 'key'
  },
  {
    title: $t('generate.fieldValue'),
    key: 'value',
    render: (row: HistoryData) => row.value.toString()
  }
]

const checkDateRange = value => {
  const [start, end] = value

  if (start && end && addMonths(start, 1) < end) {
    dateRange.value = null
    message.error($t('common.withinOneMonth'))
  } else {
    // 直接使用用户选择的时间
    params.start_time = start
    params.end_time = end
    params.export_excel = false
    getTelemetryHistoryData()
  }
}

const refresh = () => {
  params.export_excel = false
  pagination.page = 1
  getTelemetryHistoryData()
}
onMounted(getTelemetryHistoryData)
</script>

<template>
  <n-card>
    <n-flex justify="space-between" align="center">
      <n-flex justify="space-between" align="center">
        <n-date-picker
          v-model:value="dateRange"
          type="datetimerange"
          format="yyyy-MM-dd HH:mm:ss"
          :default-time="['00:00:00', '23:59:59']"
          :time-picker-props="[{ defaultValue: 0 }, { defaultValue: 86399 }]"
          @update:value="checkDateRange"
        />
        <n-button class="ml-2" @click="refresh">{{ $t('generate.refresh') }}</n-button>
      </n-flex>

      <n-button
        type="primary"
        @click="
          () => {
            params.export_excel = true
            getTelemetryHistoryData()
          }
        "
      >
        {{ $t('generate.export') }}
      </n-button>
    </n-flex>
    <div class="mt-4">
      <n-text v-if="!dateRange" depth="3">{{ $t('generate.hour-24') }}</n-text>
      <n-data-table :loading="loading" :columns="columns" :data="tableData" />
      <div class="mt-4 flex justify-end">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="pagination.pageSizes"
          :show-size-picker="pagination.showSizePicker"
          @update:page="pagination.onChange"
          @update:page-size="pagination.onUpdatePageSize"
        />
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.n-card {
  width: 100%;
}
</style>
