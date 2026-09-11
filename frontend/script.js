const API_URL = "http://127.0.0.1:8000";

const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");
const responseElement = document.getElementById("response");
const ticketIdInput = document.getElementById("ticketId");
const trackButton = document.getElementById("trackButton");
const trackingMessage = document.getElementById("trackingMessage");
const ticketDetails = document.getElementById("ticketDetails");
const refreshButton = document.getElementById("refreshButton");
const adminMessage = document.getElementById("adminMessage");
const adminKeyInput = document.getElementById("adminKey");
const ticketsTableBody = document.getElementById("ticketsTableBody");

const totalTickets = document.getElementById("totalTickets");
const pendingTickets = document.getElementById("pendingTickets");
const inProgressTickets = document.getElementById("inProgressTickets");
const resolvedTickets = document.getElementById("resolvedTickets");

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
}

function showResponse(data) {
    let ticketHtml = "";

    if (data.ticket_id !== null && data.ticket_id !== undefined) {
        ticketHtml = `
            <div class="response-item">
                <span class="field-label">Ticket ID</span>
                <strong class="field-value">${escapeHtml(data.ticket_id)}</strong>
            </div>`;
    }

    responseElement.innerHTML = `
        <div class="response-grid">
            <div class="response-item full-width">
                <span class="field-label">Question</span>
                <span class="field-value">${escapeHtml(data.question)}</span>
            </div>
            <div class="response-item">
                <span class="field-label">Category</span>
                <span class="field-value">${escapeHtml(data.category)}</span>
            </div>
            <div class="response-item">
                <span class="field-label">Department</span>
                <span class="field-value">${escapeHtml(data.department)}</span>
            </div>
            <div class="response-item full-width">
                <span class="field-label">Answer</span>
                <span class="field-value">${escapeHtml(data.answer)}</span>
            </div>
            ${ticketHtml}
        </div>`;
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type || ""}`;
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value.replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function ticketDetailsHtml(ticket) {
    return `
        <div class="ticket-detail-grid">
            <div class="ticket-detail">
                <span class="field-label">Question</span>
                <span class="field-value">${escapeHtml(ticket.question)}</span>
            </div>
            <div class="ticket-detail">
                <span class="field-label">Category</span>
                <span class="field-value">${escapeHtml(ticket.category)}</span>
            </div>
            <div class="ticket-detail">
                <span class="field-label">Department</span>
                <span class="field-value">${escapeHtml(ticket.department)}</span>
            </div>
            <div class="ticket-detail">
                <span class="field-label">Status</span>
                <span class="field-value">${escapeHtml(ticket.status)}</span>
            </div>
            <div class="ticket-detail full-width">
                <span class="field-label">Created</span>
                <span class="field-value">${escapeHtml(formatDate(ticket.created_at))}</span>
            </div>
        </div>`;
}

async function askCampusAI() {
    const question = questionInput.value.trim();

    if (question === "") {
        responseElement.innerHTML = '<p class="muted-text">Please enter a question.</p>';
        return;
    }

    askButton.disabled = true;
    responseElement.innerHTML = '<p class="muted-text">Thinking...</p>';

    try {
        const response = await fetch(`${API_URL}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ question: question })
        });

        if (!response.ok) {
            throw new Error("The assistant request failed.");
        }

        showResponse(await response.json());
    } catch (error) {
        responseElement.innerHTML = '<p class="message error">Unable to connect to CampusAI backend.</p>';
    } finally {
        askButton.disabled = false;
    }
}

async function trackTicket() {
    const ticketId = ticketIdInput.value.trim();

    if (!ticketId || Number(ticketId) < 1) {
        showMessage(trackingMessage, "Please enter a valid Ticket ID.", "error");
        ticketDetails.innerHTML = "";
        return;
    }

    trackButton.disabled = true;
    showMessage(trackingMessage, "Loading ticket...", "");
    ticketDetails.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}`);

        if (response.status === 404) {
            throw new Error("Ticket not found. Check the Ticket ID and try again.");
        }

        if (!response.ok) {
            throw new Error("Unable to load this ticket.");
        }

        ticketDetails.innerHTML = ticketDetailsHtml(await response.json());
        showMessage(trackingMessage, "Ticket loaded successfully.", "success");
    } catch (error) {
        showMessage(trackingMessage, error.message || "Unable to connect to CampusAI backend.", "error");
        ticketDetails.innerHTML = "";
    } finally {
        trackButton.disabled = false;
    }
}

function updateSummary(tickets) {
    totalTickets.textContent = tickets.length;
    pendingTickets.textContent = tickets.filter((ticket) => ticket.status === "Pending").length;
    inProgressTickets.textContent = tickets.filter((ticket) => ticket.status === "In Progress").length;
    resolvedTickets.textContent = tickets.filter((ticket) => ticket.status === "Resolved").length;
}

function renderTickets(tickets) {
    updateSummary(tickets);

    if (tickets.length === 0) {
        ticketsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No tickets found.</td></tr>';
        return;
    }

    ticketsTableBody.innerHTML = tickets.map((ticket) => `
        <tr>
            <td><strong>${escapeHtml(ticket.id)}</strong></td>
            <td>${escapeHtml(ticket.question)}</td>
            <td>${escapeHtml(ticket.category)}</td>
            <td>${escapeHtml(ticket.department)}</td>
            <td>${escapeHtml(ticket.status)}</td>
            <td>${escapeHtml(formatDate(ticket.created_at))}</td>
            <td>
                <div class="status-control">
                    <select data-ticket-id="${escapeHtml(ticket.id)}" aria-label="New status for ticket ${escapeHtml(ticket.id)}">
                        <option value="Pending" ${ticket.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                    <button class="status-button" data-ticket-id="${escapeHtml(ticket.id)}" type="button">Update</button>
                </div>
            </td>
        </tr>`).join("");
}

async function refreshTickets() {
    refreshButton.disabled = true;
    showMessage(adminMessage, "Loading tickets...", "");

    try {
        const response = await fetch(`${API_URL}/tickets`);

        if (!response.ok) {
            throw new Error("Unable to load tickets.");
        }

        renderTickets(await response.json());
        showMessage(adminMessage, "Tickets refreshed.", "success");
    } catch (error) {
        showMessage(adminMessage, "Unable to connect to CampusAI backend.", "error");
        ticketsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Tickets could not be loaded.</td></tr>';
        updateSummary([]);
    } finally {
        refreshButton.disabled = false;
    }
}

async function updateTicketStatus(ticketId, status, button) {
    const adminKey = adminKeyInput.value.trim();

    if (adminKey === "") {
        showMessage(adminMessage, "Please enter the admin key before updating a ticket.", "error");
        return;
    }

    button.disabled = true;
    showMessage(adminMessage, "Updating ticket status...", "");

    try {
        const response = await fetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Key": adminKey
            },
            body: JSON.stringify({ status: status })
        });

        if (response.status === 403) {
            throw new Error("Invalid or missing admin key.");
        }

        if (!response.ok) {
            throw new Error("Unable to update ticket status.");
        }

        showMessage(adminMessage, "Ticket status updated.", "success");
        await refreshTickets();
    } catch (error) {
        showMessage(adminMessage, error.message || "Unable to update ticket. Check the backend connection.", "error");
    } finally {
        button.disabled = false;
    }
}

askButton.addEventListener("click", askCampusAI);
trackButton.addEventListener("click", trackTicket);
refreshButton.addEventListener("click", refreshTickets);

ticketsTableBody.addEventListener("click", function (event) {
    if (!event.target.classList.contains("status-button")) {
        return;
    }

    const button = event.target;
    const ticketId = button.dataset.ticketId;
    const select = ticketsTableBody.querySelector(`select[data-ticket-id="${ticketId}"]`);
    updateTicketStatus(ticketId, select.value, button);
});

refreshTickets();