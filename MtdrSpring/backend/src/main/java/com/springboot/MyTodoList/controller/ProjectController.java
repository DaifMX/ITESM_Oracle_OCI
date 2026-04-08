package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @GetMapping
    public List<Project> getAll() {
        return projectService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getById(@PathVariable int id) {
        return projectService.findById(id)
                .map(p -> ResponseEntity.ok(p))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/team/{teamId}")
    public List<Project> getByTeam(@PathVariable int teamId) {
        return projectService.findByTeam(teamId);
    }

    @GetMapping("/status/{status}")
    public List<Project> getByStatus(@PathVariable String status) {
        return projectService.findByStatus(status);
    }

    @PostMapping
    public ResponseEntity<Project> create(@RequestBody Project project) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.save(project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable int id, @RequestBody Project project) {
        return projectService.update(id, project)
                .map(p -> ResponseEntity.ok(p))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        return projectService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
