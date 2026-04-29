package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.repository.SprintRepository;
import com.springboot.MyTodoList.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private EmployeeRepository employeeRepository;

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
        return taskService.findByAssignee(employeeId);
    }

    // ── Assignee management (single developer) ───────────────────────────────

    /** Returns a list with 0 or 1 elements: the current assignee. */
    @GetMapping("/{id}/assignees")
    public ResponseEntity<List<Employee>> getAssignees(@PathVariable int id) {
        return taskService.findById(id).map(task -> {
            if (task.getAssignee() == null) return ResponseEntity.ok(Collections.<Employee>emptyList());
            return ResponseEntity.ok(List.of(task.getAssignee()));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Assigns a developer to the task, replacing any previous assignee. */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<?> assign(@PathVariable int id, @PathVariable int employeeId) {
        Optional<Task> taskOpt = taskService.findById(id);
        if (taskOpt.isEmpty()) return ResponseEntity.notFound().build();

        Optional<Employee> empOpt = employeeRepository.findById(employeeId);
        if (empOpt.isEmpty()) return ResponseEntity.notFound().build();

        Employee emp = empOpt.get();
        if (!"developer".equalsIgnoreCase(emp.getRole()) && !"manager".equalsIgnoreCase(emp.getRole())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only developers can be assigned to tasks"));
        }

        Task task = taskOpt.get();
        task.setAssignee(emp);
        taskService.save(task);
        return ResponseEntity.status(HttpStatus.CREATED).body(emp);
    }

    /** Removes the assignee from the task. */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @DeleteMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<Void> unassign(@PathVariable int id, @PathVariable int employeeId) {
        Optional<Task> taskOpt = taskService.findById(id);
        if (taskOpt.isEmpty()) return ResponseEntity.notFound().build();

        Task task = taskOpt.get();
        if (task.getAssignee() == null || task.getAssignee().getEmployeeId() != employeeId)
            return ResponseEntity.notFound().build();

        task.setAssignee(null);
        taskService.save(task);
        return ResponseEntity.noContent().build();
    }
}
