const API_URL = "http://127.0.0.1:8000";
const views = document.querySelectorAll(".view");
const siteNav = document.getElementById("siteNav");
const heroDepartment = document.getElementById("heroDepartment");
let currentUser = null;
let allTickets = [];
let captchaIds = {};

const questionInput = document.getElementById("question");
const responseElement = document.getElementById("response");
const ticketIdInput = document.getElementById("ticketId");
const ticketDetails = document.getElementById("ticketDetails");
const ticketsTableBody = document.getElementById("ticketsTableBody");
const fullName = document.getElementById("fullName");
const studentId = document.getElementById("studentId");
const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const confirmPassword = document.getElementById("confirmPassword");
const department = document.getElementById("department");
const otherDepartment = document.getElementById("otherDepartment");
const registerCaptchaAnswer = document.getElementById("registerCaptchaAnswer");
const loginValue = document.getElementById("loginValue");
const loginPassword = document.getElementById("loginPassword");
const loginCaptchaAnswer = document.getElementById("loginCaptchaAnswer");
const adminUsername = document.getElementById("adminUsername");
const adminPassword = document.getElementById("adminPassword");
const adminCaptchaAnswer = document.getElementById("adminCaptchaAnswer");
const ticketSearch = document.getElementById("ticketSearch");
const departmentFilter = document.getElementById("departmentFilter");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
}

function token() {
    return localStorage.getItem("campusai_token");
}

function authHeaders(json = false) {
    const headers = {};
    if (json) {
        headers["Content-Type"] = "application/json";
    }
    if (token()) {
        headers.Authorization = `Bearer ${token()}`;
    }
    return headers;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) }
    });

    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        const message = data.detail || "Unable to connect to CampusAI.";
        const requestError = new Error(message);
        requestError.status = response.status;
        throw requestError;
    }

    return data;
}

function showMessage(element, message, type = "") {
    element.textContent = message;
    element.className = `message ${type}`;
}

function showView(viewName) {
    const target = document.getElementById(`${viewName}View`);
    if (!target) {
        return;
    }

    views.forEach((view) => view.classList.toggle("active-view", view === target));
    renderNavigation(viewName);
    window.scrollTo(0, 0);

    if (viewName === "admin" && currentUser && currentUser.role === "admin") {
        loadTickets();
    }
}

function renderNavigation(activeView = "home") {
    if (!currentUser) {
        siteNav.innerHTML = `
            <a href="#home" data-view="home" class="nav-link ${activeView === "home" ? "active" : ""}">Home</a>
            <a href="#login" data-view="login" class="nav-link ${activeView === "login" ? "active" : ""}">Student Login</a>
            <a href="#adminLogin" data-view="adminLogin" class="nav-link ${activeView === "adminLogin" ? "active" : ""}">Admin Login</a>`;
    } else if (currentUser.role === "admin") {
        siteNav.innerHTML = `
            <a href="#admin" data-view="admin" class="nav-link ${activeView === "admin" ? "active" : ""}">Dashboard</a>
            <a href="#home" data-view="home" class="nav-link ${activeView === "home" ? "active" : ""}">Home</a>
            <button class="nav-link nav-button" data-action="logout" type="button">Logout</button>`;
    } else {
        siteNav.innerHTML = `
            <a href="#home" data-view="home" class="nav-link ${activeView === "home" ? "active" : ""}">Home</a>
            <a href="#student" data-view="student" class="nav-link ${activeView === "student" ? "active" : ""}">Student Assistant</a>
            <a href="#tickets" data-view="tickets" class="nav-link ${activeView === "tickets" ? "active" : ""}">My Tickets</a>
            <a href="#profile" data-view="profile" class="nav-link ${activeView === "profile" ? "active" : ""}">Profile</a>
            <button class="nav-link nav-button" data-action="logout" type="button">Logout</button>`;
    }
}

function setCurrentUser(user) {
    currentUser = user;
    if (!user) {
        heroDepartment.innerHTML = "Student Services<br>Portal";
        return;
    }

    const department = user.role === "admin" ? "Campus-wide Student Services" : user.department;
    heroDepartment.textContent = department;

    if (user.role === "student") {
        document.getElementById("studentGreeting").textContent = `Welcome, ${user.full_name}`;
        document.getElementById("profileName").textContent = user.full_name;
        document.getElementById("profileDepartment").textContent = user.department;
        document.getElementById("profileStudentId").textContent = user.student_id;
    }
}

async function loadCaptcha(formName) {
    const questionElement = document.getElementById(`${formName}CaptchaQuestion`);
    const answerElement = document.getElementById(`${formName}CaptchaAnswer`);
    try {
        const data = await apiRequest("/captcha");
        captchaIds[formName] = data.captcha_id;
        questionElement.textContent = data.question;
        answerElement.value = "";
    } catch (error) {
        questionElement.textContent = "Verification unavailable";
    }
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }
    const date = new Date(value.replace(" ", "T") + "Z");
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusBadge(status) {
    const className = status === "Resolved" ? "resolved" : status === "In Progress" ? "progress" : "pending";
    const marker = status === "Resolved" ? "✓" : status === "In Progress" ? "!" : "•";
    return `<span class="status-badge ${className}"><span aria-hidden="true">${marker}</span>${escapeHtml(status)}</span>`;
}

function statusTrack(status) {
    const statuses = ["Pending", "In Progress", "Resolved"];
    const currentIndex = statuses.indexOf(status);
    return `<div class="status-track" aria-label="Ticket progress">${statuses.map((item, index) => `<div class="status-step ${index <= currentIndex ? "active" : ""} ${item === status ? "current" : ""}">${item}</div>`).join("")}</div>`;
}

function showResponse(data) {
    const ticketHtml = data.ticket_id == null ? "" : `<div class="ticket-created"><span class="field-label">Ticket Created</span><strong>Ticket ID: #${escapeHtml(data.ticket_id)}</strong><button class="text-button" type="button" data-track-ticket="${escapeHtml(data.ticket_id)}">Track This Ticket →</button></div>`;
    responseElement.innerHTML = `<div class="response-grid"><div class="response-item full-width"><span class="field-label">Question</span><span class="field-value">${escapeHtml(data.question)}</span></div><div class="response-item"><span class="field-label">Category</span><span class="field-value">${escapeHtml(data.category)}</span></div><div class="response-item"><span class="field-label">Department</span><span class="field-value">${escapeHtml(data.department)}</span></div><div class="response-item full-width"><span class="field-label">Answer</span><span class="field-value">${escapeHtml(data.answer)}</span></div>${ticketHtml}</div>`;
}

async function askCampusAI() {
    const button = document.getElementById("askButton");
    const question = questionInput.value.trim();
    if (!question) {
        responseElement.innerHTML = '<p class="message error">Please enter a question.</p>';
        return;
    }

    button.disabled = true;
    responseElement.innerHTML = '<p class="muted-text">Thinking...</p>';
    try {
        showResponse(await apiRequest("/ask", { method: "POST", body: JSON.stringify({ question }) }));
    } catch (error) {
        responseElement.innerHTML = `<p class="message error">${escapeHtml(error.status === 401 ? "Please log in to continue." : error.message)}</p>`;
    } finally {
        button.disabled = false;
    }
}

function ticketDetailsHtml(ticket) {
    return `${statusTrack(ticket.status)}<div class="ticket-detail-grid"><div class="ticket-detail full-width"><span class="field-label">Ticket #${escapeHtml(ticket.id)}</span><span class="field-value">${escapeHtml(ticket.question)}</span></div><div class="ticket-detail"><span class="field-label">Category</span><span class="field-value">${escapeHtml(ticket.category)}</span></div><div class="ticket-detail"><span class="field-label">Department</span><span class="field-value">${escapeHtml(ticket.department)}</span></div><div class="ticket-detail"><span class="field-label">Status</span><span class="field-value">${statusBadge(ticket.status)}</span></div><div class="ticket-detail"><span class="field-label">Created Time</span><span class="field-value">${escapeHtml(formatDate(ticket.created_at))}</span></div></div>`;
}

async function trackTicket() {
    const message = document.getElementById("trackingMessage");
    const button = document.getElementById("trackButton");
    const ticketId = ticketIdInput.value.trim();
    if (!/^\d+$/.test(ticketId) || Number(ticketId) < 1) {
        showMessage(message, "Please enter a valid Ticket ID.", "error");
        ticketDetails.innerHTML = "";
        return;
    }

    button.disabled = true;
    showMessage(message, "Loading ticket...");
    try {
        ticketDetails.innerHTML = ticketDetailsHtml(await apiRequest(`/tickets/${encodeURIComponent(ticketId)}`));
        showMessage(message, "Ticket loaded successfully.", "success");
    } catch (error) {
        showMessage(message, error.status === 403 ? "You do not have permission to access this ticket." : error.message, "error");
        ticketDetails.innerHTML = "";
    } finally {
        button.disabled = false;
    }
}

function updateDashboardSummary(tickets) {
    document.getElementById("totalTickets").textContent = tickets.length;
    document.getElementById("pendingTickets").textContent = tickets.filter((ticket) => ticket.status === "Pending").length;
    document.getElementById("inProgressTickets").textContent = tickets.filter((ticket) => ticket.status === "In Progress").length;
    document.getElementById("resolvedTickets").textContent = tickets.filter((ticket) => ticket.status === "Resolved").length;
    document.getElementById("unresolvedTickets").textContent = tickets.filter((ticket) => ticket.status !== "Resolved").length;

    const categoryCounts = {};
    const departmentCounts = {};
    const departmentOverview = {};
    tickets.forEach((ticket) => {
        categoryCounts[ticket.category] = (categoryCounts[ticket.category] || 0) + 1;
        departmentCounts[ticket.department] = (departmentCounts[ticket.department] || 0) + 1;
        departmentOverview[ticket.department] = (departmentOverview[ticket.department] || 0) + 1;
    });
    document.getElementById("commonCategory").textContent = mostCommon(categoryCounts);
    document.getElementById("topDepartment").textContent = mostCommon(departmentCounts);
    document.getElementById("departmentOverview").innerHTML = Object.entries(departmentOverview).map(([name, count]) => `<div class="department-row"><span>${escapeHtml(name)}</span><strong>${count}</strong></div>`).join("") || '<p class="muted-text">No department data yet.</p>';
}

function mostCommon(counts) {
    const entries = Object.entries(counts).sort((first, second) => second[1] - first[1]);
    return entries.length ? entries[0][0] : "No data yet";
}

function renderFilterOptions(tickets) {
    const departmentFilter = document.getElementById("departmentFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const departments = [...new Set(tickets.map((ticket) => ticket.department))].sort();
    const categories = [...new Set(tickets.map((ticket) => ticket.category))].sort();
    departmentFilter.innerHTML = '<option value="">All departments</option>' + departments.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
    categoryFilter.innerHTML = '<option value="">All categories</option>' + categories.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
}

function renderTickets() {
    const search = document.getElementById("ticketSearch").value.toLowerCase();
    const department = document.getElementById("departmentFilter").value;
    const category = document.getElementById("categoryFilter").value;
    const status = document.getElementById("statusFilter").value;
    const filtered = allTickets.filter((ticket) => {
        const matchesSearch = [ticket.question, ticket.category, ticket.department, ticket.student_name].join(" ").toLowerCase().includes(search);
        return matchesSearch && (!department || ticket.department === department) && (!category || ticket.category === category) && (!status || ticket.status === status);
    });

    ticketsTableBody.innerHTML = filtered.length ? filtered.map((ticket) => `<tr><td><strong>#${escapeHtml(ticket.id)}</strong></td><td>${escapeHtml(ticket.student_name || "Legacy ticket")}</td><td>${escapeHtml(ticket.department)}</td><td>${escapeHtml(ticket.question)}</td><td>${escapeHtml(ticket.category)}</td><td>${statusBadge(ticket.status)}</td><td>${escapeHtml(formatDate(ticket.created_at))}</td><td><div class="status-control"><select data-ticket-id="${ticket.id}"><option ${ticket.status === "Pending" ? "selected" : ""}>Pending</option><option ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option><option ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option></select><button class="status-button" data-ticket-id="${ticket.id}" type="button">Update</button></div></td></tr>`).join("") : '<tr><td colspan="8" class="empty-state">No matching tickets.</td></tr>';
}

async function loadTickets() {
    const message = document.getElementById("adminMessage");
    const button = document.getElementById("refreshButton");
    button.disabled = true;
    showMessage(message, "Loading tickets...");
    try {
        allTickets = await apiRequest("/tickets");
        renderFilterOptions(allTickets);
        updateDashboardSummary(allTickets);
        renderTickets();
        showMessage(message, "Tickets refreshed.", "success");
    } catch (error) {
        showMessage(message, error.status === 401 ? "Please log in to continue." : error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function updateTicketStatus(ticketId, status, button) {
    const message = document.getElementById("adminMessage");
    button.disabled = true;
    showMessage(message, "Updating ticket status...");
    try {
        await apiRequest(`/tickets/${encodeURIComponent(ticketId)}/status`, { method: "PUT", body: JSON.stringify({ status }) });
        showMessage(message, "Ticket status updated.", "success");
        await loadTickets();
    } catch (error) {
        showMessage(message, error.status === 403 ? "You do not have permission to access this area." : error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function submitRegistration(event) {
    event.preventDefault();
    const message = document.getElementById("registerMessage");
    showMessage(message, "Creating account...");
    try {
        await apiRequest("/register", { method: "POST", body: JSON.stringify({ full_name: fullName.value, student_id: studentId.value, username: registerUsername.value, password: registerPassword.value, confirm_password: confirmPassword.value, department: department.value, other_department: otherDepartment.value, captcha_id: captchaIds.register, captcha_answer: registerCaptchaAnswer.value }) });
        showMessage(message, "Account created. Please log in.", "success");
        document.getElementById("registrationForm").reset();
        showView("login");
    } catch (error) {
        showMessage(message, error.message, "error");
        loadCaptcha("register");
    }
}

async function submitStudentLogin(event) {
    event.preventDefault();
    const message = document.getElementById("loginMessage");
    showMessage(message, "Signing in...");
    try {
        const data = await apiRequest("/login", { method: "POST", body: JSON.stringify({ login: loginValue.value, password: loginPassword.value, captcha_id: captchaIds.login, captcha_answer: loginCaptchaAnswer.value }) });
        localStorage.setItem("campusai_token", data.token);
        setCurrentUser(data.user);
        currentUser.role = data.role;
        showView("home");
    } catch (error) {
        showMessage(message, error.message, "error");
        loadCaptcha("login");
    }
}

async function submitAdminLogin(event) {
    event.preventDefault();
    const message = document.getElementById("adminLoginMessage");
    showMessage(message, "Signing in...");
    try {
        const data = await apiRequest("/admin/login", { method: "POST", body: JSON.stringify({ username: adminUsername.value, password: adminPassword.value, captcha_id: captchaIds.admin, captcha_answer: adminCaptchaAnswer.value }) });
        localStorage.setItem("campusai_token", data.token);
        currentUser = { ...data.user, role: data.role };
        setCurrentUser(currentUser);
        showView("admin");
    } catch (error) {
        showMessage(message, error.message, "error");
        loadCaptcha("admin");
    }
}

async function logout() {
    try {
        await apiRequest("/logout", { method: "POST" });
    } catch (error) {
        // Local logout still clears the token if the backend is unavailable.
    }
    localStorage.removeItem("campusai_token");
    currentUser = null;
    setCurrentUser(null);
    showView("home");
}

function bindEvents() {
    siteNav.addEventListener("click", (event) => {
        const link = event.target.closest("[data-view]");
        const action = event.target.closest("[data-action]");
        if (action && action.dataset.action === "logout") {
            logout();
            return;
        }
        if (link) {
            event.preventDefault();
            showView(link.dataset.view);
        }
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
        if (!button.closest("#siteNav")) {
            button.addEventListener("click", () => showView(button.dataset.view));
        }
    });
    document.querySelectorAll(".question-chip, .category-link").forEach((button) => button.addEventListener("click", () => { questionInput.value = button.dataset.question; showView("student"); questionInput.focus(); }));
    document.getElementById("askButton").addEventListener("click", askCampusAI);
    document.getElementById("trackButton").addEventListener("click", trackTicket);
    document.getElementById("refreshButton").addEventListener("click", loadTickets);
    document.getElementById("registrationForm").addEventListener("submit", submitRegistration);
    document.getElementById("studentLoginForm").addEventListener("submit", submitStudentLogin);
    document.getElementById("adminLoginForm").addEventListener("submit", submitAdminLogin);
    document.getElementById("openRegisterButton").addEventListener("click", () => { showView("register"); loadCaptcha("register"); });
    document.getElementById("backToLoginButton").addEventListener("click", () => { showView("login"); loadCaptcha("login"); });
    department.addEventListener("change", () => document.getElementById("otherDepartmentGroup").classList.toggle("hidden", department.value !== "Other"));
    document.getElementById("response").addEventListener("click", (event) => { const button = event.target.closest("[data-track-ticket]"); if (button) { ticketIdInput.value = button.dataset.trackTicket; showView("tickets"); trackTicket(); } });
    document.getElementById("ticketsTableBody").addEventListener("click", (event) => { if (event.target.classList.contains("status-button")) { const id = event.target.dataset.ticketId; const select = document.querySelector(`select[data-ticket-id="${id}"]`); updateTicketStatus(id, select.value, event.target); } });
    ["ticketSearch", "departmentFilter", "categoryFilter", "statusFilter"].forEach((id) => document.getElementById(id).addEventListener("input", renderTickets));
    document.getElementById("clearFiltersButton").addEventListener("click", () => { ticketSearch.value = ""; departmentFilter.value = ""; categoryFilter.value = ""; statusFilter.value = ""; renderTickets(); });
}

async function startApp() {
    bindEvents();
    renderNavigation();
    if (!token()) {
        loadCaptcha("login");
        loadCaptcha("admin");
        return;
    }
    try {
        const user = await apiRequest("/me");
        setCurrentUser(user);
        currentUser = user;
        showView(user.role === "admin" ? "admin" : "home");
    } catch (error) {
        localStorage.removeItem("campusai_token");
        loadCaptcha("login");
        loadCaptcha("admin");
    }
}

startApp();
