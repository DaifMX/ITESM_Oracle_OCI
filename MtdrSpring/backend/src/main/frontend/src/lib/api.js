import { authFetch } from './auth'

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects() {
  const res = await authFetch('/projects')
  if (!res.ok) throw new Error('Failed to load projects')
  return res.json()
}

export async function createProject(data) {
  const res = await authFetch('/projects', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

export async function updateProject(id, data) {
  const res = await authFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update project')
  return res.json()
}

export async function deleteProject(id) {
  const res = await authFetch(`/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete project')
}

// ─── Sprints ─────────────────────────────────────────────────────────────────

export async function getSprintsByProject(projectId) {
  const res = await authFetch(`/sprints/project/${projectId}`)
  if (!res.ok) throw new Error('Failed to load sprints')
  return res.json()
}

export async function getActiveSprint(projectId) {
  const res = await authFetch(`/sprints/project/${projectId}/active`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to load active sprint')
  return res.json()
}

export async function createSprint(data) {
  const res = await authFetch('/sprints', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create sprint')
  return res.json()
}

export async function updateSprint(id, data) {
  const res = await authFetch(`/sprints/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update sprint')
  return res.json()
}

export async function deleteSprint(id) {
  const res = await authFetch(`/sprints/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete sprint')
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasksBySprint(sprintId) {
  const res = await authFetch(`/tasks/sprint/${sprintId}`)
  if (!res.ok) throw new Error('Failed to load tasks')
  return res.json()
}

export async function getTasksByProject(projectId) {
  const res = await authFetch(`/tasks/project/${projectId}`)
  if (!res.ok) throw new Error('Failed to load tasks')
  return res.json()
}

export async function createTask(data) {
  const res = await authFetch('/tasks', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create task')
  return res.json()
}

export async function updateTask(id, data) {
  const res = await authFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}

export async function deleteTask(id) {
  const res = await authFetch(`/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete task')
}

export async function getTasksByEmployee(employeeId) {
  const res = await authFetch(`/tasks/employee/${employeeId}`)
  if (!res.ok) throw new Error('Failed to load tasks')
  return res.json()
}

export async function getTaskAssignees(taskId) {
  const res = await authFetch(`/tasks/${taskId}/assignees`)
  if (!res.ok) throw new Error('Failed to load assignees')
  return res.json()
}

export async function assignEmployee(taskId, employeeId) {
  const res = await authFetch(`/tasks/${taskId}/assignees/${employeeId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to assign employee')
  return res.json()
}

export async function unassignEmployee(taskId, employeeId) {
  const res = await authFetch(`/tasks/${taskId}/assignees/${employeeId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to unassign employee')
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getComments(taskId) {
  const res = await authFetch(`/tasks/${taskId}/comments`)
  if (!res.ok) throw new Error('Failed to load comments')
  return res.json()
}

export async function createComment(taskId, content) {
  const res = await authFetch(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('Failed to create comment')
  return res.json()
}

export async function deleteComment(commentId) {
  const res = await authFetch(`/comments/${commentId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete comment')
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function getEmployees() {
  const res = await authFetch('/employees')
  if (!res.ok) throw new Error('Failed to load employees')
  return res.json()
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function getTeams() {
  const res = await authFetch('/teams')
  if (!res.ok) throw new Error('Failed to load teams')
  return res.json()
}
