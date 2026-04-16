package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.EmployeeTask;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.SprintRepository;
import com.springboot.MyTodoList.service.EmployeeTaskService;
import com.springboot.MyTodoList.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private EmployeeTaskService employeeTaskService;

    @Autowired
    private SprintRepository sprintRepository;

    private ResponseEntity<?> validateTaskDates(Task task) {
        if (task.getSprint() == null) return null;
        Optional<Sprint> sprintOpt = sprintRepository.findById(task.getSprint().getSprintId());
        if (sprintOpt.isEmpty()) return null;
        Sprint sprint = sprintOpt.get();
        LocalDate sprintStart = sprint.getStartDate();
        LocalDate sprintEnd = sprint.getEndDate();
        LocalDate taskStart = task.getStartDate();
        LocalDate taskEnd = task.getExpectedEndDate();
        if (taskStart != null && sprintStart != null && taskStart.isBefore(sprintStart))
            return ResponseEntity.badRequest().body(Map.of("error", "Task start date cannot be before sprint start date"));
        if (taskStart != null && sprintEnd != null && taskStart.isAfter(sprintEnd))
            return ResponseEntity.badRequest().body(Map.of("error", "Task start date cannot be after sprint end date"));
        if (taskEnd != null && sprintEnd != null && taskEnd.isAfter(sprintEnd))
            return ResponseEntity.badRequest().body(Map.of("error", "Task due date cannot be after sprint end date"));
        if (taskEnd != null && sprintStart != null && taskEnd.isBefore(sprintStart))
            return ResponseEntity.badRequest().body(Map.of("error", "Task due date cannot be before sprint start date"));
        return null;
    }

    @GetMapping
    public List<Task> getAll() {
        return taskService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable int id) {
        return taskService.findById(id)
                .map(t -> ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/project/{projectId}")
    public List<Task> getByProject(@PathVariable int projectId) {
        return taskService.findByProject(projectId);
    }

    @GetMapping("/sprint/{sprintId}")
    public List<Task> getBySprint(@PathVariable int sprintId) {
        return taskService.findBySprint(sprintId);
    }

    @GetMapping("/status/{status}")
    public List<Task> getByStatus(@PathVariable String status) {
        return taskService.findByStatus(status);
    }

    @GetMapping("/project/{projectId}/status/{status}")
    public List<Task> getByProjectAndStatus(@PathVariable int projectId, @PathVariable String status) {
        return taskService.findByProjectAndStatus(projectId, status);
    }

    @GetMapping("/sprint/{sprintId}/status/{status}")
    public List<Task> getBySprintAndStatus(@PathVariable int sprintId, @PathVariable String status) {
        return taskService.findBySprintAndStatus(sprintId, status);
    }

    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Task task) {
        ResponseEntity<?> err = validateTaskDates(task);
        if (err != null) return err;
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.save(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Task task) {
        ResponseEntity<?> err = validateTaskDates(task);
        if (err != null) return err;
        return taskService.update(id, task)
                .map(t -> ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        return taskService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @GetMapping("/employee/{employeeId}")
    public List<Task> getByEmployee(@PathVariable int employeeId) {
        return employeeTaskService.findByEmployee(employeeId).stream()
                .map(et -> et.getTask())
                .collect(java.util.stream.Collectors.toList());
    }

    // Assignee management

    @GetMapping("/{id}/assignees")
    public List<EmployeeTask> getAssignees(@PathVariable int id) {
        return employeeTaskService.findByTask(id);
    }

    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<EmployeeTask> assign(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTaskService.assign(id, employeeId)
                .map(et -> ResponseEntity.status(HttpStatus.CREATED).body(et))
                .orElse(ResponseEntity.status(HttpStatus.CONFLICT).build());
    }

    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @DeleteMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<Void> unassign(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTaskService.unassign(id, employeeId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
