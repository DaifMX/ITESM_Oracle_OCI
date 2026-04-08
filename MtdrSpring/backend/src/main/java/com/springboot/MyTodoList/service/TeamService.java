package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Team;
import com.springboot.MyTodoList.repository.TeamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TeamService {

    @Autowired
    private TeamRepository teamRepository;

    public List<Team> findAll() {
        return teamRepository.findAll();
    }

    public Optional<Team> findById(int id) {
        return teamRepository.findById(id);
    }

    public List<Team> findByManager(int managerId) {
        return teamRepository.findByManager_EmployeeId(managerId);
    }

    public Team save(Team team) {
        return teamRepository.save(team);
    }

    public Optional<Team> update(int id, Team updated) {
        return teamRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setManager(updated.getManager());
            return teamRepository.save(existing);
        });
    }

    public boolean delete(int id) {
        if (!teamRepository.existsById(id)) return false;
        teamRepository.deleteById(id);
        return true;
    }
}
