const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");
const responseText = document.getElementById("response");

askButton.addEventListener("click", async function () {

    const question = questionInput.value.trim();

    if (question === "") {
        responseText.textContent = "Please enter a question.";
        return;
    }

    responseText.textContent = "Thinking...";

    try {
        const response = await fetch("http://127.0.0.1:8000/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ question: question })
        });

        if (!response.ok) {
            throw new Error("Request failed");
        }

        const data = await response.json();
        responseText.textContent = data.answer;
    } catch (error) {
        responseText.textContent = "Unable to connect to CampusAI backend.";
    }
});