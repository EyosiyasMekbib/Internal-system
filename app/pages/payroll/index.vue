<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: employees, refresh: refreshEmployees } = await useFetch('/api/employees')
const { data: payrollRuns, refresh: refreshPayrollRuns } = await useFetch('/api/payroll')

const activeTab = ref<'employees' | 'runs'>('employees')

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

function periodLabel(month: string | number, year: string | number) {
  return `${MONTHS[Number(month) - 1]} ${year}`
}

// ── EMPLOYEES ─────────────────────────────────────────────────────────────────

const showEmployeeForm = ref(false)
const employeeForm = reactive({
  tin: '',
  fullName: '',
  pensionId: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  basicSalary: '',
  transportAllowance: '',
})
const employeeSaving = ref(false)
const employeeError = ref('')
const selectedEmployee = ref<any>(null)

const enrichedEmployees = computed(() =>
  ((employees.value as any[]) ?? []).map(e => ({
    ...e,
    _active: !e.endDate,
  }))
)

function openNewEmployee() {
  selectedEmployee.value = null
  Object.assign(employeeForm, {
    tin: '', fullName: '', pensionId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', basicSalary: '', transportAllowance: '',
  })
  employeeError.value = ''
  showEmployeeForm.value = true
}

function openEditEmployee(row: any) {
  selectedEmployee.value = row
  Object.assign(employeeForm, {
    tin: row.tin,
    fullName: row.fullName,
    pensionId: row.pensionId || '',
    startDate: row.startDate,
    endDate: row.endDate || '',
    basicSalary: row.basicSalary,
    transportAllowance: row.transportAllowance,
  })
  employeeError.value = ''
  showEmployeeForm.value = true
}

async function saveEmployee() {
  if (!employeeForm.tin || !employeeForm.fullName || !employeeForm.startDate || !employeeForm.basicSalary) {
    employeeError.value = 'TIN, Full Name, Start Date and Basic Salary are required.'
    return
  }
  employeeSaving.value = true
  employeeError.value = ''
  try {
    if (selectedEmployee.value) {
      await $fetch(`/api/employees/${selectedEmployee.value.id}`, { method: 'PUT', body: employeeForm })
    } else {
      await $fetch('/api/employees', { method: 'POST', body: employeeForm })
    }
    showEmployeeForm.value = false
    await refreshEmployees()
  } catch (err: any) {
    employeeError.value = err?.data?.message || 'Failed to save.'
  } finally {
    employeeSaving.value = false
  }
}

// ── PAYROLL RUNS ──────────────────────────────────────────────────────────────

const existingRunPeriods = computed(() => {
  const set = new Set<string>()
  for (const r of (payrollRuns.value as any[]) ?? []) {
    set.add(`${r.month}-${r.year}`)
  }
  return set
})

const runFormIsRerun = computed(() =>
  existingRunPeriods.value.has(`${runForm.month}-${runForm.year}`)
)

const showRunForm = ref(false)
const runForm = reactive({
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  notes: '',
})
const overTimeMap = ref<Record<string, string>>({})
const otherBenefitMap = ref<Record<string, string>>({})
const runSaving = ref(false)
const runError = ref('')

function openRunForm() {
  Object.assign(runForm, {
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    notes: '',
  })
  overTimeMap.value = {}
  otherBenefitMap.value = {}
  runError.value = ''
  showRunForm.value = true
}

// Preview calc mirrors server logic (Ethiopian proclamation 1395/2017)
function previewPayslip(emp: any) {
  const basic = Number(emp.basicSalary)
  const transport = Number(emp.transportAllowance || 0)
  const overtime = Number(overTimeMap.value[emp.id] || 0)
  const other = Number(otherBenefitMap.value[emp.id] || 0)
  const taxableTransport = Math.max(0, transport - 600)
  const totalTaxable = basic + taxableTransport + overtime + other
  let tax = 0
  if (totalTaxable > 14000) tax = totalTaxable * 0.35 - 2050
  else if (totalTaxable > 10000) tax = totalTaxable * 0.30 - 1350
  else if (totalTaxable > 7000) tax = totalTaxable * 0.25 - 850
  else if (totalTaxable > 4000) tax = totalTaxable * 0.20 - 500
  else if (totalTaxable > 2000) tax = totalTaxable * 0.15 - 300
  const pension = basic * 0.07
  const gross = basic + transport + overtime + other
  return { gross, tax: Math.round(tax * 100) / 100, pension: Math.round(pension * 100) / 100, net: Math.round((gross - tax - pension) * 100) / 100 }
}

const runPreviewTotals = computed(() => {
  const emps = (employees.value as any[]) ?? []
  return emps.reduce((acc, emp) => {
    const p = previewPayslip(emp)
    return { gross: acc.gross + p.gross, tax: acc.tax + p.tax, pension: acc.pension + p.pension, net: acc.net + p.net }
  }, { gross: 0, tax: 0, pension: 0, net: 0 })
})

async function createPayrollRun() {
  runError.value = ''
  runSaving.value = true
  try {
    const overTimeByEmployee: Record<string, number> = {}
    const otherBenefitByEmployee: Record<string, number> = {}
    for (const [id, val] of Object.entries(overTimeMap.value)) {
      if (Number(val) > 0) overTimeByEmployee[id] = Number(val)
    }
    for (const [id, val] of Object.entries(otherBenefitMap.value)) {
      if (Number(val) > 0) otherBenefitByEmployee[id] = Number(val)
    }
    await $fetch('/api/payroll', {
      method: 'POST',
      body: { ...runForm, overTimeByEmployee, otherBenefitByEmployee },
    })
    showRunForm.value = false
    await refreshPayrollRuns()
  } catch (err: any) {
    runError.value = err?.data?.message || 'Failed to create payroll run.'
  } finally {
    runSaving.value = false
  }
}

// ── RUN DETAIL ────────────────────────────────────────────────────────────────

const showRunDetail = ref(false)
const detailRun = ref<any>(null)
const runDetailLoading = ref(false)

async function openRunDetail(row: any) {
  runDetailLoading.value = true
  showRunDetail.value = true
  detailRun.value = null
  try {
    detailRun.value = await $fetch(`/api/payroll/${row.id}`)
  } finally {
    runDetailLoading.value = false
  }
}

const detailTotals = computed(() => {
  if (!detailRun.value?.payslips?.length) return null
  const slips = detailRun.value.payslips as any[]
  return {
    gross: slips.reduce((s, p) => s + Number(p.basicSalary) + Number(p.transportAllowance) + Number(p.overTime) + Number(p.otherTaxableBenefit), 0),
    tax: slips.reduce((s, p) => s + Number(p.taxWithheld), 0),
    empPension: slips.reduce((s, p) => s + Number(p.costSharing), 0),
    employerPension: slips.reduce((s, p) => s + Number(p.employerPension), 0),
    net: slips.reduce((s, p) => s + Number(p.netPay), 0),
  }
})

async function downloadExcel(runId: string) {
  try {
    const buffer = await $fetch(`/api/payroll/${runId}/export`, { responseType: 'arrayBuffer' })
    const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payroll_${detailRun.value.year}_${String(detailRun.value.month).padStart(2, '0')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Failed to download Excel file.')
  }
}
</script>

<template>
  <div>
    <div class="print:hidden">
      <KPageHeader title="Payroll" subtitle="Employee records and monthly payroll runs" />

      <!-- Tabs -->
      <div class="px-8 border-b border-border flex gap-0">
        <button
          @click="activeTab = 'employees'"
          :class="[
            'px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'employees'
              ? 'text-text border-red'
              : 'text-muted hover:text-text border-transparent'
          ]"
        >
          Employees
          <span v-if="(employees as any[])?.length" class="ml-2 text-xs text-muted font-mono">{{ (employees as any[]).length }}</span>
        </button>
        <button
          @click="activeTab = 'runs'"
          :class="[
            'px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'runs'
              ? 'text-text border-red'
              : 'text-muted hover:text-text border-transparent'
          ]"
        >
          Payroll Runs
          <span v-if="(payrollRuns as any[])?.length" class="ml-2 text-xs text-muted font-mono">{{ (payrollRuns as any[]).length }}</span>
        </button>
      </div>

      <!-- ── EMPLOYEES TAB ── -->
      <div v-if="activeTab === 'employees'" class="px-8 py-6">
        <div class="mb-5 flex items-center justify-between">
          <p class="text-sm text-muted">
            Click a row to edit. Active employees are included in payroll runs.
          </p>
          <button
            @click="openNewEmployee"
            class="px-4 py-2 bg-red text-bg text-sm font-medium hover:bg-red/90 transition-colors"
          >
            + Add Employee
          </button>
        </div>

        <div v-if="!enrichedEmployees.length" class="py-20 text-center">
          <p class="font-display text-xl text-text mb-2">No employees yet</p>
          <p class="text-sm text-muted mb-6">Add employees before running payroll.</p>
          <button @click="openNewEmployee" class="px-4 py-2 bg-red text-bg text-sm font-medium">+ Add First Employee</button>
        </div>

        <div v-else class="border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-surface">
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Full Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">TIN</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Pension ID</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Start Date</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Basic Salary</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Transport</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="emp in enrichedEmployees"
                :key="emp.id"
                @click="openEditEmployee(emp)"
                class="border-b border-border last:border-0 hover:bg-surface cursor-pointer transition-colors"
              >
                <td class="px-4 py-3 font-medium">{{ emp.fullName }}</td>
                <td class="px-4 py-3 text-muted font-mono text-xs">{{ emp.tin }}</td>
                <td class="px-4 py-3 text-muted font-mono text-xs">{{ emp.pensionId || '—' }}</td>
                <td class="px-4 py-3 text-muted">{{ emp.startDate }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ fmt(emp.basicSalary) }}</td>
                <td class="px-4 py-3 text-right font-mono text-muted">{{ fmt(emp.transportAllowance || 0) }}</td>
                <td class="px-4 py-3 text-center">
                  <span :class="emp._active
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-surface text-muted border border-border'"
                    class="text-xs px-2 py-0.5 font-medium"
                  >
                    {{ emp._active ? 'Active' : 'Terminated' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── PAYROLL RUNS TAB ── -->
      <div v-if="activeTab === 'runs'" class="px-8 py-6">
        <div class="mb-5 flex items-center justify-between">
          <p class="text-sm text-muted">Click a run to view payslips and export to Excel.</p>
          <button
            @click="openRunForm"
            class="px-4 py-2 bg-red text-bg text-sm font-medium hover:bg-red/90 transition-colors"
          >
            + Run Payroll
          </button>
        </div>

        <div v-if="!(payrollRuns as any[])?.length" class="py-20 text-center">
          <p class="font-display text-xl text-text mb-2">No payroll runs yet</p>
          <p class="text-sm text-muted mb-6">Create your first payroll run to generate payslips.</p>
          <button @click="openRunForm" class="px-4 py-2 bg-red text-bg text-sm font-medium">+ Run Payroll</button>
        </div>

        <div v-else class="border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-surface">
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Period</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide w-24">Employees</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Total Gross</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Tax Withheld</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Pension</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Net Pay</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="run in (payrollRuns as any[])"
                :key="run.id"
                @click="openRunDetail(run)"
                class="border-b border-border last:border-0 hover:bg-surface cursor-pointer transition-colors"
              >
                <td class="px-4 py-3">
                  <span class="font-display font-bold text-base">{{ periodLabel(run.month, run.year) }}</span>
                  <span v-if="run.notes" class="ml-3 text-xs text-muted">{{ run.notes }}</span>
                </td>
                <td class="px-4 py-3 text-right font-mono text-muted">{{ run.employeeCount }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ fmt(run.totalGross) }}</td>
                <td class="px-4 py-3 text-right font-mono text-muted">{{ fmt(run.totalTax) }}</td>
                <td class="px-4 py-3 text-right font-mono text-muted">{{ fmt(run.totalPension) }}</td>
                <td class="px-4 py-3 text-right font-mono font-medium">{{ fmt(run.totalNet) }}</td>
                <td class="px-4 py-3 text-muted text-xs">{{ new Date(run.createdAt).toLocaleDateString('en-ET') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── EMPLOYEE FORM PANEL ── -->
    <Teleport to="body">
      <div
        v-if="showEmployeeForm"
        class="fixed inset-0 z-50 flex items-start justify-end"
        @click.self="showEmployeeForm = false"
      >
        <div class="absolute inset-0 bg-text/10" @click="showEmployeeForm = false" />
        <div class="relative w-[540px] h-full bg-bg border-l border-border flex flex-col shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="font-display text-lg font-bold">{{ selectedEmployee ? 'Edit Employee' : 'New Employee' }}</h2>
              <p class="text-xs text-muted mt-0.5">{{ selectedEmployee ? 'Update employee record' : 'Add to payroll roster' }}</p>
            </div>
            <button class="text-muted hover:text-red text-lg leading-none" @click="showEmployeeForm = false">✕</button>
          </div>

          <!-- Form -->
          <form class="flex-1 overflow-y-auto p-6" @submit.prevent="saveEmployee">
            <div class="space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Full Name <span class="text-red">*</span></label>
                  <input v-model="employeeForm.fullName" required placeholder="e.g. Abebe Kebede"
                    class="w-full bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-text transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">TIN <span class="text-red">*</span></label>
                  <input v-model="employeeForm.tin" required placeholder="0000000000"
                    class="w-full bg-surface border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-text transition-colors" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Pension ID</label>
                  <input v-model="employeeForm.pensionId" placeholder="Optional"
                    class="w-full bg-surface border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-text transition-colors" />
                </div>
              </div>

              <div class="border-t border-border pt-5">
                <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Employment Period</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-muted mb-1.5">Start Date <span class="text-red">*</span></label>
                    <div class="relative">
                      <input v-model="employeeForm.startDate" type="date" required
                        class="w-full bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-text transition-colors pr-8" />
                      <button
                        v-if="employeeForm.startDate"
                        type="button"
                        @click="employeeForm.startDate = ''"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-red text-xs leading-none"
                        title="Clear"
                      >✕</button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs text-muted mb-1.5">End Date <span class="text-muted font-normal">(leave blank if active)</span></label>
                    <div class="relative">
                      <input v-model="employeeForm.endDate" type="date"
                        class="w-full bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-text transition-colors pr-8" />
                      <button
                        v-if="employeeForm.endDate"
                        type="button"
                        @click="employeeForm.endDate = ''"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-red text-xs leading-none"
                        title="Clear"
                      >✕</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-border pt-5">
                <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Compensation</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-muted mb-1.5">Basic Salary (ETB) <span class="text-red">*</span></label>
                    <input v-model="employeeForm.basicSalary" type="number" step="0.01" required placeholder="0.00"
                      class="w-full bg-surface border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-text transition-colors" />
                  </div>
                  <div>
                    <label class="block text-xs text-muted mb-1.5">Transport Allowance (ETB)</label>
                    <input v-model="employeeForm.transportAllowance" type="number" step="0.01" placeholder="0.00"
                      class="w-full bg-surface border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-text transition-colors" />
                    <p class="text-xs text-muted mt-1">First 600 ETB is tax-free</p>
                  </div>
                </div>
              </div>

              <div v-if="employeeError" class="bg-red-light border border-red/20 px-4 py-3 text-sm text-red">
                {{ employeeError }}
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-border flex gap-3 justify-end">
              <button type="button" @click="showEmployeeForm = false"
                class="px-4 py-2 border border-border text-sm text-muted hover:text-text hover:border-text transition-colors">
                Cancel
              </button>
              <button type="submit" :disabled="employeeSaving"
                class="px-5 py-2 bg-red text-bg text-sm font-medium disabled:opacity-50 hover:bg-red/90 transition-colors">
                {{ employeeSaving ? 'Saving…' : (selectedEmployee ? 'Save Changes' : 'Add Employee') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ── PAYROLL RUN FORM PANEL ── -->
    <Teleport to="body">
      <div
        v-if="showRunForm"
        class="fixed inset-0 z-50 flex items-start justify-end"
        @click.self="showRunForm = false"
      >
        <div class="absolute inset-0 bg-text/10" @click="showRunForm = false" />
        <div class="relative w-[700px] h-full bg-bg border-l border-border flex flex-col shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="font-display text-lg font-bold">Run Payroll</h2>
              <p class="text-xs text-muted mt-0.5">Generate payslips for all active employees</p>
            </div>
            <button class="text-muted hover:text-red text-lg leading-none" @click="showRunForm = false">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <!-- Period -->
            <div class="px-6 py-5 border-b border-border">
              <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Pay Period</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-muted mb-1.5">Month</label>
                  <select v-model="runForm.month" class="w-full bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-text transition-colors">
                    <option v-for="(m, i) in MONTHS" :key="i" :value="String(i + 1)">{{ m }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted mb-1.5">Year</label>
                  <input v-model="runForm.year" type="number" min="2000" max="2100"
                    class="w-full bg-surface border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-text transition-colors" />
                </div>
              </div>
              <div class="mt-4">
                <label class="block text-xs text-muted mb-1.5">Notes (optional)</label>
                <input v-model="runForm.notes" placeholder="e.g. includes bonus"
                  class="w-full bg-surface border border-border px-3 py-2.5 text-sm outline-none focus:border-text transition-colors" />
              </div>
            </div>

            <!-- Per-employee adjustments -->
            <div class="px-6 py-5">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-medium text-muted uppercase tracking-wide">Per-Employee Adjustments</p>
                <span class="text-xs text-muted">{{ (employees as any[])?.length || 0 }} employees</span>
              </div>

              <div v-if="!(employees as any[])?.length" class="py-8 text-center border border-border bg-surface">
                <p class="text-sm text-muted">No employees found. Add employees first.</p>
              </div>

              <div v-else class="border border-border">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-border bg-surface">
                      <th class="px-3 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">Employee</th>
                      <th class="px-3 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Basic</th>
                      <th class="px-3 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide w-28">Overtime</th>
                      <th class="px-3 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide w-28">Other Benefit</th>
                      <th class="px-3 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Est. Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="emp in (employees as any[])"
                      :key="emp.id"
                      class="border-b border-border last:border-0"
                    >
                      <td class="px-3 py-2.5">
                        <div class="font-medium text-sm">{{ emp.fullName }}</div>
                        <div class="text-xs text-muted font-mono">{{ emp.tin }}</div>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono text-sm">{{ fmt(emp.basicSalary) }}</td>
                      <td class="px-3 py-2.5">
                        <input
                          v-model="overTimeMap[emp.id]"
                          type="number" step="0.01" placeholder="0.00"
                          class="w-full bg-surface border border-border px-2 py-1.5 text-sm font-mono text-right outline-none focus:border-text transition-colors"
                        />
                      </td>
                      <td class="px-3 py-2.5">
                        <input
                          v-model="otherBenefitMap[emp.id]"
                          type="number" step="0.01" placeholder="0.00"
                          class="w-full bg-surface border border-border px-2 py-1.5 text-sm font-mono text-right outline-none focus:border-text transition-colors"
                        />
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono text-sm font-medium">
                        {{ fmt(previewPayslip(emp).net) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Preview totals -->
              <div v-if="(employees as any[])?.length" class="mt-4 grid grid-cols-4 gap-3">
                <div class="bg-surface border border-border px-3 py-3 text-center">
                  <div class="text-xs text-muted mb-1">Gross</div>
                  <div class="font-mono text-sm font-medium">{{ fmt(runPreviewTotals.gross) }}</div>
                </div>
                <div class="bg-surface border border-border px-3 py-3 text-center">
                  <div class="text-xs text-muted mb-1">Tax</div>
                  <div class="font-mono text-sm">{{ fmt(runPreviewTotals.tax) }}</div>
                </div>
                <div class="bg-surface border border-border px-3 py-3 text-center">
                  <div class="text-xs text-muted mb-1">Pension</div>
                  <div class="font-mono text-sm">{{ fmt(runPreviewTotals.pension) }}</div>
                </div>
                <div class="bg-surface border border-border px-3 py-3 text-center">
                  <div class="text-xs text-muted mb-1">Net Pay</div>
                  <div class="font-mono text-sm font-bold">{{ fmt(runPreviewTotals.net) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-5 border-t border-border flex-shrink-0">
            <div v-if="runFormIsRerun" class="mb-4 bg-surface border border-border px-4 py-3 text-sm text-muted">
              A run for this period already exists — re-running will replace all existing payslips.
            </div>
            <div v-if="runError" class="mb-4 bg-red-light border border-red/20 px-4 py-3 text-sm text-red">
              {{ runError }}
            </div>
            <div class="flex gap-3 justify-end">
              <button type="button" @click="showRunForm = false"
                class="px-4 py-2 border border-border text-sm text-muted hover:text-text hover:border-text transition-colors">
                Cancel
              </button>
              <button
                @click="createPayrollRun"
                :disabled="runSaving || !(employees as any[])?.length"
                class="px-5 py-2 bg-red text-bg text-sm font-medium disabled:opacity-50 hover:bg-red/90 transition-colors"
              >
                {{ runSaving ? 'Processing…' : runFormIsRerun ? `Re-run Payroll — ${periodLabel(runForm.month, runForm.year)}` : `Run Payroll — ${periodLabel(runForm.month, runForm.year)}` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── RUN DETAIL PANEL ── -->
    <Teleport to="body">
      <div
        v-if="showRunDetail"
        class="fixed inset-0 z-50 flex items-start justify-end"
        @click.self="showRunDetail = false"
      >
        <div class="absolute inset-0 bg-text/10" @click="showRunDetail = false" />
        <div class="relative w-[920px] h-full bg-bg border-l border-border flex flex-col shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="font-display text-lg font-bold">
                {{ detailRun ? periodLabel(detailRun.month, detailRun.year) : 'Loading…' }}
              </h2>
              <p class="text-xs text-muted mt-0.5">
                <template v-if="detailRun">
                  {{ detailRun.payslips?.length || 0 }} employees
                  <span v-if="detailRun.notes"> · {{ detailRun.notes }}</span>
                </template>
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                v-if="detailRun"
                @click="downloadExcel(detailRun.id)"
                class="px-4 py-2 border border-border text-xs font-medium text-muted hover:text-text hover:border-text transition-colors flex items-center gap-2"
              >
                <span>↓</span> Export Excel
              </button>
              <button class="text-muted hover:text-red text-lg leading-none" @click="showRunDetail = false">✕</button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="runDetailLoading" class="flex-1 flex items-center justify-center">
            <p class="text-muted text-sm">Loading payslips…</p>
          </div>

          <template v-else-if="detailRun">
            <!-- Summary bar -->
            <div v-if="detailTotals" class="px-6 py-4 border-b border-border grid grid-cols-5 gap-4 flex-shrink-0">
              <div>
                <div class="text-xs text-muted uppercase tracking-wide mb-1">Total Gross</div>
                <div class="font-mono text-base font-bold">{{ fmt(detailTotals.gross) }}</div>
              </div>
              <div>
                <div class="text-xs text-muted uppercase tracking-wide mb-1">Tax Withheld</div>
                <div class="font-mono text-base">{{ fmt(detailTotals.tax) }}</div>
              </div>
              <div>
                <div class="text-xs text-muted uppercase tracking-wide mb-1">Emp. Pension (7%)</div>
                <div class="font-mono text-base">{{ fmt(detailTotals.empPension) }}</div>
              </div>
              <div>
                <div class="text-xs text-muted uppercase tracking-wide mb-1">Employer Cost (11%)</div>
                <div class="font-mono text-base text-muted">{{ fmt(detailTotals.employerPension) }}</div>
              </div>
              <div class="border-l border-border pl-4">
                <div class="text-xs text-muted uppercase tracking-wide mb-1">Net Pay</div>
                <div class="font-mono text-base font-bold text-text">{{ fmt(detailTotals.net) }}</div>
              </div>
            </div>

            <!-- Payslips table -->
            <div class="flex-1 overflow-auto">
              <table class="w-full text-sm min-w-[860px]">
                <thead class="sticky top-0">
                  <tr class="border-b border-border bg-surface">
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Employee</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Basic</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Transport</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Overtime</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Taxable</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Tax</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Pension</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="slip in detailRun.payslips"
                    :key="slip.id"
                    class="border-b border-border last:border-0 hover:bg-surface transition-colors"
                  >
                    <td class="px-4 py-3">
                      <div class="font-medium">{{ slip.fullName }}</div>
                      <div class="text-xs text-muted font-mono">{{ slip.tin }}</div>
                    </td>
                    <td class="px-3 py-3 text-right font-mono">{{ fmt(slip.basicSalary) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted">{{ fmt(slip.transportAllowance) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted">{{ fmt(slip.overTime) }}</td>
                    <td class="px-3 py-3 text-right font-mono">{{ fmt(slip.totalTaxable) }}</td>
                    <td class="px-3 py-3 text-right font-mono">{{ fmt(slip.taxWithheld) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted">{{ fmt(slip.costSharing) }}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold">{{ fmt(slip.netPay) }}</td>
                  </tr>
                </tbody>
                <!-- Totals row -->
                <tfoot v-if="detailTotals">
                  <tr class="border-t-2 border-border bg-surface">
                    <td class="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">
                      Total ({{ detailRun.payslips.length }} employees)
                    </td>
                    <td class="px-3 py-3 text-right font-mono font-bold text-xs">{{ fmt(detailRun.payslips.reduce((s: number, p: any) => s + Number(p.basicSalary), 0)) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted text-xs">{{ fmt(detailRun.payslips.reduce((s: number, p: any) => s + Number(p.transportAllowance), 0)) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted text-xs">{{ fmt(detailRun.payslips.reduce((s: number, p: any) => s + Number(p.overTime), 0)) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-xs">{{ fmt(detailRun.payslips.reduce((s: number, p: any) => s + Number(p.totalTaxable), 0)) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-xs">{{ fmt(detailTotals.tax) }}</td>
                    <td class="px-3 py-3 text-right font-mono text-muted text-xs">{{ fmt(detailTotals.empPension) }}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-xs">{{ fmt(detailTotals.net) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
