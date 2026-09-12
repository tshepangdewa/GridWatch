import { supabase } from "./supabase.js";

const form = document.getElementById("login-form");

const errorBox =
    document.getElementById("login-error");

async function checkExistingSession() {

    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (session) {
        window.location.href = "admin.html";
    }
}

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    errorBox.textContent = "";

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value;

    const button =
        form.querySelector("button");

    button.disabled = true;

    button.textContent = "SIGNING IN...";

    const {
        data,
        error
    } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        console.error(
            "Login failed:",
            error
        );

        errorBox.textContent =
            "Invalid email or password.";

        button.disabled = false;

        button.textContent = "SIGN IN";

        return;
    }

    if (!data.session) {

        errorBox.textContent =
            "Unable to create a session.";

        button.disabled = false;

        button.textContent = "SIGN IN";

        return;
    }

    window.location.href = "admin.html";
});

checkExistingSession();