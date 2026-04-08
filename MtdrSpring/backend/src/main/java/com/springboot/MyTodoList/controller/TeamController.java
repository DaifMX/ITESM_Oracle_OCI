package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.EmployeeTeam;
import com.springboot.MyTodoList.model.Team;
import com.springboot.MyTodoList.service.EmployeeTeamService;
import com.springboot.MyTodoList.service.TeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teams")
public class TeamController {

    @Autowired
    private TeamService teamService;

    @Autowired
    private EmployeeTeamService employeeTeamService;

    @GetMapping
    public List<Team> getAll() {
        return teamService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Team> getById(@PathVariable int id) {
        return teamService.findById(id)
                .map(t -> ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/manager/{managerId}")
    public List<Team> getByManager(@PathVariable int managerId) {
        return teamService.findByManager(managerId);
    }

    @PostMapping
    public ResponseEntity<Team> create(@RequestBody Team team) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.save(team));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Team> update(@PathVariable int id, @RequestBody Team team) {
        return teamService.update(id, team)
                .map(t -> ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        return teamService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // Member management

    @GetMapping("/{id}/members")
    public List<EmployeeTeam> getMembers(@PathVariable int id) {
        return employeeTeamService.findByTeam(id);
    }

    @PostMapping("/{id}/members/{employeeId}")
    public ResponseEntity<EmployeeTeam> addMember(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTeamService.addMember(id, employeeId)
                .map(et -> ResponseEntity.status(HttpStatus.CREATED).body(et))
                .orElse(ResponseEntity.status(HttpStatus.CONFLICT).build());
    }

    @DeleteMapping("/{id}/members/{employeeId}")
    public ResponseEntity<Void> removeMember(@PathVariable int id, @PathVariable int employeeId) {
        return employeeTeamService.removeMember(id, employeeId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
