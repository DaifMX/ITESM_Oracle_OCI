package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private RagDirtyEnqueuer ragDirty;

    public List<Project> findAll() {
        return projectRepository.findAll();
    }

    public Optional<Project> findById(int id) {
        return projectRepository.findById(id);
    }

    public Optional<Project> findByShortName(String shortName) {
        return projectRepository.findByShortNameIgnoreCase(shortName);
    }

    public List<Project> findByTeam(int teamId) {
        return projectRepository.findByTeam_TeamId(teamId);
    }

    public List<Project> findByStatus(String status) {
        return projectRepository.findByStatus(status);
    }

    public Project save(Project project) {
        ensureShortName(project);
        Project saved = projectRepository.save(project);
        ragDirty.upsert(RagDirtyEnqueuer.TYPE_PROJECT, saved.getProjectId());
        return saved;
    }

    public Optional<Project> update(int id, Project updated) {
        return projectRepository.findById(id).map(existing -> {
            existing.setTeam(updated.getTeam());
            existing.setName(updated.getName());
            if (updated.getShortName() != null && !updated.getShortName().isBlank()) {
                String key = normalizeShortName(updated.getShortName());
                projectRepository.findByShortNameIgnoreCase(key)
                    .filter(other -> other.getProjectId() != id)
                    .ifPresent(other -> {
                        throw new IllegalArgumentException(
                            "Short name " + key + " is already used by project " + other.getName());
                    });
                existing.setShortName(key);
            }
            existing.setDescription(updated.getDescription());
            existing.setStatus(updated.getStatus());
            existing.setStartDate(updated.getStartDate());
            existing.setEndDate(updated.getEndDate());
            ensureShortName(existing);
            Project saved = projectRepository.save(existing);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_PROJECT, saved.getProjectId());
            return saved;
        });
    }

    /**
     * Guarantees the project has a unique Jira-style key (SHORT_NAME).
     * Provided keys are normalized; missing keys are derived from the name
     * ("Payments Platform" -> PP, "p1" -> P1), with a numeric suffix on
     * collision.
     */
    public void ensureShortName(Project project) {
        if (project.getShortName() != null && !project.getShortName().isBlank()) {
            project.setShortName(normalizeShortName(project.getShortName()));
            return;
        }
        String base = deriveShortName(project.getName());
        String candidate = base;
        int suffix = 2;
        while (true) {
            Optional<Project> clash = projectRepository.findByShortNameIgnoreCase(candidate);
            if (clash.isEmpty() || clash.get().getProjectId() == project.getProjectId()) break;
            candidate = base + suffix++;
        }
        project.setShortName(candidate);
    }

    public static String normalizeShortName(String raw) {
        String key = raw.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (key.isEmpty()) {
            throw new IllegalArgumentException("Short name must contain letters or digits");
        }
        return key.length() > 10 ? key.substring(0, 10) : key;
    }

    private static String deriveShortName(String name) {
        if (name == null || name.isBlank()) return "PRJ";
        String[] words = name.trim().toUpperCase().split("[^A-Z0-9]+");
        StringBuilder initials = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) initials.append(w.charAt(0));
        }
        // Single short word ("p1") -> use it whole; otherwise use initials.
        String key;
        if (words.length == 1 && words[0].length() <= 5) {
            key = words[0];
        } else if (initials.length() >= 2) {
            key = initials.toString();
        } else {
            key = words[0].substring(0, Math.min(4, words[0].length()));
        }
        return key.length() > 10 ? key.substring(0, 10) : key;
    }

    public boolean delete(int id) {
        if (!projectRepository.existsById(id)) return false;
        projectRepository.deleteById(id);
        ragDirty.delete(RagDirtyEnqueuer.TYPE_PROJECT, id);
        return true;
    }
}
