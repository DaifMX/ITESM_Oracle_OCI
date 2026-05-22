package com.springboot.MyTodoList.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(EmployeeController.class)
public class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private com.springboot.MyTodoList.repository.EmployeeRepository employeeRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    public void setup() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
        Mockito.reset(userService, employeeRepository);
    }

    private void setCaller(String email, String role) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(email, null);
        SecurityContextHolder.setContext(new SecurityContextImpl(auth));
        Employee caller = new Employee();
        caller.setEmail(email);
        caller.setRole(role);
        when(employeeRepository.findByEmail(email)).thenReturn(Optional.of(caller));
    }

    @Test
    public void developerCannotCreateManagerOrAdmin() throws Exception {
        setCaller("dev@example.com", "developer");

        Employee createMgr = new Employee();
        createMgr.setEmail("newmgr@example.com");
        createMgr.setRole("manager");

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createMgr)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());

        Employee createAdmin = new Employee();
        createAdmin.setEmail("newadmin@example.com");
        createAdmin.setRole("admin");

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createAdmin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    public void onlyManagerOrAdminCanCreateEmployee() throws Exception {
        // developer cannot create
        setCaller("dev2@example.com", "developer");
        Employee e = new Employee();
        e.setEmail("user@example.com");
        e.setRole("developer");

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isForbidden());

        // manager can create developer
        setCaller("mgr@example.com", "manager");
        when(userService.addEmployee(any(Employee.class))).thenReturn(e);

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isOk());

        // manager cannot create manager
        Employee mgr = new Employee();
        mgr.setEmail("newmgr2@example.com");
        mgr.setRole("manager");

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(mgr)))
                .andExpect(status().isForbidden());

        // admin can create (we assert admin can create employee)
        setCaller("admin@example.com", "admin");
        when(userService.addEmployee(any(Employee.class))).thenReturn(e);

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isOk());
    }

    @Test
    public void adminCanOnlyCreateManager() throws Exception {
        // This test encodes the requirement that an admin should only be able to create managers.
        // Depending on current controller logic this may fail until controller is updated.
        setCaller("admin2@example.com", "admin");

        Employee createManager = new Employee();
        createManager.setEmail("mgr3@example.com");
        createManager.setRole("manager");
        when(userService.addEmployee(any(Employee.class))).thenReturn(createManager);

        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createManager)))
                .andExpect(status().isOk());

        // admin should NOT be able to create a developer (per requirement)
        Employee createDev = new Employee();
        createDev.setEmail("dev3@example.com");
        createDev.setRole("developer");

        // Expecting forbidden according to requested rule. If implementation allows it,
        // this assertion will fail and indicates controller needs updating.
        mockMvc.perform(post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createDev)))
                .andExpect(status().isForbidden());
    }
}
