package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.id.EmployeeTeamId;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.EmployeeTeam;
import com.springboot.MyTodoList.model.Team;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.repository.EmployeeTeamRepository;
import com.springboot.MyTodoList.repository.TeamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class EmployeeTeamService {

    @Autowired
    private EmployeeTeamRepository employeeTeamRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private TeamRepository teamRepository;

    public List<EmployeeTeam> findByTeam(int teamId) {
        return employeeTeamRepository.findById_TeamId(teamId);
    }

    public List<EmployeeTeam> findByEmployee(int employeeId) {
        return employeeTeamRepository.findById_EmployeeId(employeeId);
    }

    public Optional<EmployeeTeam> addMember(int teamId, int employeeId) {
        if (employeeTeamRepository.existsById_EmployeeIdAndId_TeamId(employeeId, teamId)) {
            return Optional.empty();
        }
        Optional<Employee> employee = employeeRepository.findById(employeeId);
        Optional<Team> team = teamRepository.findById(teamId);
        if (employee.isEmpty() || team.isEmpty()) return Optional.empty();

        EmployeeTeam et = new EmployeeTeam();
        et.setId(new EmployeeTeamId(employeeId, teamId));
        et.setEmployee(employee.get());
        et.setTeam(team.get());
        et.setJoinedAt(LocalDate.now());
        return Optional.of(employeeTeamRepository.save(et));
    }

    public boolean removeMember(int teamId, int employeeId) {
        EmployeeTeamId id = new EmployeeTeamId(employeeId, teamId);
        if (!employeeTeamRepository.existsById(id)) return false;
        employeeTeamRepository.deleteById(id);
        return true;
    }
}
