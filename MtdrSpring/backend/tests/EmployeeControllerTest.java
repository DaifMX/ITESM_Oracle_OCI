package com.springboot.MyTodoList.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.springboot.MyTodoList.security.WebSecurityConfiguration;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(EmployeeController.class)
@Import(WebSecurityConfiguration.class)
public class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private com.springboot.MyTodoList.repository.EmployeeRepository employeeRepository;

    // Required by the security filter chain (JwtAuthFilter) that @WebMvcTest loads.
    @MockitoBean
    private com.springboot.MyTodoList.security.JwtUtil jwtUtil;

    @MockitoBean
    private com.springboot.MyTodoList.security.UserDetailsServiceImpl userDetailsService;

    private final ObjectMapper mapper = new ObjectMapper();

    // Email of the authenticated caller for the request being built; applied via user(...).
    private String callerEmail;

    @AfterEach
    public void tearDown() {
        Mockito.reset(userService, employeeRepository);
    }

    private void setCaller(String email, String role) {
        this.callerEmail = email;
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
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createMgr)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());

        Employee createAdmin = new Employee();
        createAdmin.setEmail("newadmin@example.com");
        createAdmin.setRole("admin");

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
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
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isForbidden());

        // manager can create developer
        setCaller("mgr@example.com", "manager");
        when(userService.addEmployee(any(Employee.class))).thenReturn(e);

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isOk());

        // manager cannot create manager
        Employee mgr = new Employee();
        mgr.setEmail("newmgr2@example.com");
        mgr.setRole("manager");

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(mgr)))
                .andExpect(status().isForbidden());

        // admin can create (we assert admin can create employee)
        setCaller("admin@example.com", "admin");
        when(userService.addEmployee(any(Employee.class))).thenReturn(e);

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(e)))
                .andExpect(status().isOk());
    }

    @Test
    public void adminCanCreateAnyRole() throws Exception {
        // An admin is not restricted by target role: they may create managers and developers.
        setCaller("admin2@example.com", "admin");

        Employee createManager = new Employee();
        createManager.setEmail("mgr3@example.com");
        createManager.setRole("manager");
        when(userService.addEmployee(any(Employee.class))).thenReturn(createManager);

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createManager)))
                .andExpect(status().isOk());

        // admin can also create a developer
        Employee createDev = new Employee();
        createDev.setEmail("dev3@example.com");
        createDev.setRole("developer");
        when(userService.addEmployee(any(Employee.class))).thenReturn(createDev);

        mockMvc.perform(post("/employees")
                .with(user(callerEmail))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createDev)))
                .andExpect(status().isOk());
    }
}
