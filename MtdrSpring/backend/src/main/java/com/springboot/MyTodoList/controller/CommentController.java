package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Comment;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.service.CommentService;
import com.springboot.MyTodoList.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class CommentController {

    @Autowired
    private CommentService commentService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @GetMapping("/tasks/{taskId}/comments")
    public List<Comment> getByTask(@PathVariable int taskId) {
        return commentService.findByTask(taskId);
    }

    @GetMapping("/comments/{id}")
    public ResponseEntity<Comment> getById(@PathVariable int id) {
        return commentService.findById(id)
                .map(c -> ResponseEntity.ok(c))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<Comment> create(@PathVariable int taskId, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Task> taskOpt = taskService.findById(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(email);
        if (employeeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Comment comment = new Comment();
        comment.setTask(taskOpt.get());
        comment.setEmployee(employeeOpt.get());
        comment.setContent(content);

        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.save(comment));
    }

    @PatchMapping("/comments/{id}")
    public ResponseEntity<Comment> update(@PathVariable int id, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return commentService.update(id, content)
                .map(c -> ResponseEntity.ok(c))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        return commentService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
