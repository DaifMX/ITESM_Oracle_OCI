package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SprintService {

    @Autowired
    private SprintRepository sprintRepository;

    public List<Sprint> findAll() {
        return sprintRepository.findAll();
    }

    public Optional<Sprint> findById(int id) {
        return sprintRepository.findById(id);
    }

    public List<Sprint> findByProject(int projectId) {
        return sprintRepository.findByProject_ProjectId(projectId);
    }

    public Optional<Sprint> findActiveByProject(int projectId) {
        return sprintRepository.findByProject_ProjectIdAndStatus(projectId, "active");
    }

    public List<Sprint> findByStatus(String status) {
        return sprintRepository.findByStatus(status);
    }

    public Sprint save(Sprint sprint) {
        return sprintRepository.save(sprint);
    }

    public Optional<Sprint> update(int id, Sprint updated) {
        return sprintRepository.findById(id).map(existing -> {
            existing.setProject(updated.getProject());
            existing.setName(updated.getName());
            existing.setGoal(updated.getGoal());
            existing.setStartDate(updated.getStartDate());
            existing.setEndDate(updated.getEndDate());
            existing.setStatus(updated.getStatus());
            return sprintRepository.save(existing);
        });
    }

    public boolean delete(int id) {
        if (!sprintRepository.existsById(id)) return false;
        sprintRepository.deleteById(id);
        return true;
    }
}
