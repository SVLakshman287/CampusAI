const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");
const responseText = document.getElementById("response");

askButton.addEventListener("click", function () {

    const question = questionInput.value.trim();

    if (question === "") {
        responseText.textContent = "Please enter a question.";
        return;
    }

    responseText.textContent =
        "You asked: " + question;
});