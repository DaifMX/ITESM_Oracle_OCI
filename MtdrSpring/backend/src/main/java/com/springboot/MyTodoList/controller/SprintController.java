package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.ProjectRepository;
import com.springboot.MyTodoList.service.SprintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/sprints")
public class SprintController {

    @Autowired
    private SprintService sprintService;

    @Autowired
    private ProjectRepository projectRepository;

    private ResponseEntity<?> validateSprintDates(Sprint sprint) {
        // Basic: start must not be after end
        if (sprint.getStartDate() != null && sprint.getEndDate() != null
                && sprint.getStartDate().isAfter(sprint.getEndDate()))
            return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
        // Against project range
        if (sprint.getProject() == null) return null;
        Optional<Project> projOpt = projectRepository.findById(sprint.getProject().getProjectId());
        if (projOpt.isEmpty()) return null;
        Project project = projOpt.get();
        LocalDate projStart = project.getStartDate();
        LocalDate projEnd = project.getEndDate();
        LocalDate sprintStart = sprint.getStartDate();
        LocalDate sprintEnd = sprint.getEndDate();
        if (sprintStart != null && projStart != null && sprintStart.isBefore(projStart))
            return ResponseEntity.badRequest().body(Map.of("error", "Sprint start date cannot be before project start date"));
        if (sprintStart != null && projEnd != null && sprintStart.isAfter(projEnd))
            return ResponseEntity.badRequest().body(Map.of("error", "Sprint start date cannot be after project end date"));
        if (sprintEnd != null && projEnd != null && sprintEnd.isAfter(projEnd))
            return ResponseEntity.badRequest().body(Map.of("error", "Sprint end date cannot be after project end date"));
        if (sprintEnd != null && projStart != null && sprintEnd.isBefore(projStart))
            return ResponseEntity.badRequest().body(Map.of("error", "Sprint end date cannot be before project start date"));
        return null;
    }

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
    public ResponseEntity<?> create(@RequestBody Sprint sprint) {
        ResponseEntity<?> err = validateSprintDates(sprint);
        if (err != null) return err;
        return ResponseEntity.status(HttpStatus.CREATED).body(sprintService.save(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Sprint sprint) {
        ResponseEntity<?> err = validateSprintDates(sprint);
        if (err != null) return err;
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
