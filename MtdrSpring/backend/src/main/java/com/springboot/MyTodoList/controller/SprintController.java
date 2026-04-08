package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.service.SprintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sprints")
public class SprintController {

    @Autowired
    private SprintService sprintService;

    @GetMapping
    public List<Sprint> getAll() {
        return sprintService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sprint> getById(@PathVariable int id) {
        return sprintService.findById(id)
                .map(s -> ResponseEntity.ok(s))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/project/{projectId}")
    public List<Sprint> getByProject(@PathVariable int projectId) {
        return sprintService.findByProject(projectId);
    }

    @GetMapping("/project/{projectId}/active")
    public ResponseEntity<Sprint> getActiveByProject(@PathVariable int projectId) {
        return sprintService.findActiveByProject(projectId)
                .map(s -> ResponseEntity.ok(s))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public List<Sprint> getByStatus(@PathVariable String status) {
        return sprintService.findByStatus(status);
    }

    @PostMapping
    public ResponseEntity<Sprint> create(@RequestBody Sprint sprint) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sprintService.save(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sprint> update(@PathVariable int id, @RequestBody Sprint sprint) {
        return sprintService.update(id, sprint)
                .map(s -> ResponseEntity.ok(s))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        return sprintService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
