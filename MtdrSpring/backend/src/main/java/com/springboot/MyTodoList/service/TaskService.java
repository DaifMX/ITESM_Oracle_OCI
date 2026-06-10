package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.CommentRepository;
import com.springboot.MyTodoList.repository.ProjectRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private RagDirtyEnqueuer ragDirty;

    public List<Task> findAll() {
        return taskRepository.findAll();
    }

    public Optional<Task> findById(int id) {
        return taskRepository.findById(id);
    }

    /** Looks up a task by Jira-style ticket key, e.g. "P1-7". */
    public Optional<Task> findByTicketKey(String ticketKey) {
        if (ticketKey == null) return Optional.empty();
        int dash = ticketKey.lastIndexOf('-');
        if (dash <= 0 || dash == ticketKey.length() - 1) return Optional.empty();
        String projectKey = ticketKey.substring(0, dash).trim();
        int ticketNumber;
        try {
            ticketNumber = Integer.parseInt(ticketKey.substring(dash + 1).trim());
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
        return projectRepository.findByShortNameIgnoreCase(projectKey)
            .flatMap(p -> taskRepository.findByProject_ProjectIdAndTicketNumber(p.getProjectId(), ticketNumber));
    }

    public List<Task> findByProject(int projectId) {
        return taskRepository.findByProject_ProjectId(projectId);
    }

    public List<Task> findBySprint(int sprintId) {
        return taskRepository.findBySprint_SprintId(sprintId);
    }

    public List<Task> findByStatus(String status) {
        return taskRepository.findByStatus(status);
    }

    public List<Task> findByProjectAndStatus(int projectId, String status) {
        return taskRepository.findByProject_ProjectIdAndStatus(projectId, status);
    }

    public List<Task> findBySprintAndStatus(int sprintId, String status) {
        return taskRepository.findBySprint_SprintIdAndStatus(sprintId, status);
    }

    public List<Task> findByProjectAndSprint(int projectId, int sprintId) {
        return taskRepository.findByProject_ProjectIdAndSprint_SprintId(projectId, sprintId);
    }

    public List<Task> findByAssignee(int employeeId) {
        return taskRepository.findByAssignee_EmployeeId(employeeId);
    }

    public Task save(Task task) {
        assignTicketNumber(task);
        Task saved = taskRepository.save(task);
        ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, saved.getTaskId());
        return saved;
    }

    /** Gives new tasks the next sequential ticket number within their project. */
    private void assignTicketNumber(Task task) {
        if (task.getTicketNumber() != null || task.getProject() == null) return;
        task.setTicketNumber(taskRepository.findMaxTicketNumber(task.getProject().getProjectId()) + 1);
    }

    public Optional<Task> update(int id, Task updated) {
        return taskRepository.findById(id).map(existing -> {
            existing.setSprint(updated.getSprint());
            existing.setProject(updated.getProject());
            existing.setTitle(updated.getTitle());
            existing.setDescription(updated.getDescription());
            existing.setStatus(updated.getStatus());
            existing.setPriority(updated.getPriority());
            existing.setStoryPoints(updated.getStoryPoints());
            existing.setEstimatedHours(updated.getEstimatedHours());
            existing.setTotalHours(updated.getTotalHours());
            existing.setStartDate(updated.getStartDate());
            existing.setExpectedEndDate(updated.getExpectedEndDate());
            existing.setEndDate(updated.getEndDate());
            Task saved = taskRepository.save(existing);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, saved.getTaskId());
            return saved;
        });
    }

    @Transactional
    public boolean delete(int id) {
        if (!taskRepository.existsById(id)) return false;
        commentRepository.deleteAll(commentRepository.findByTask_TaskIdOrderByCreatedAtAsc(id));
        taskRepository.deleteById(id);
        ragDirty.delete(RagDirtyEnqueuer.TYPE_TASK, id);
        return true;
    }
}
