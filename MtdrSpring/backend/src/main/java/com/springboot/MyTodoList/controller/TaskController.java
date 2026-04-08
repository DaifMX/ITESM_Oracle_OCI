package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.EmployeeTask;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.service.EmployeeTaskService;
import com.springboot.MyTodoList.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private EmployeeTaskService employeeTaskService;

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

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task task) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.save(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable int id, @RequestBody Task task) {
        return taskService.update(id, task)
                .map(t -> ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

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

    @PostMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<EmployeeTask> assign(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTaskService.assign(id, employeeId)
                .map(et -> ResponseEntity.status(HttpStatus.CREATED).body(et))
                .orElse(ResponseEntity.status(HttpStatus.CONFLICT).build());
    }

    @DeleteMapping("/{id}/assignees/{employeeId}")
    public ResponseEntity<Void> unassign(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTaskService.unassign(id, employeeId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
