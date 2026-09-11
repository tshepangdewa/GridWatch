import { supabase } from "./supabase.js";
import { townships } from "./data/townships.js";


// --------------------------------
// AUTHENTICATION CHECK
// --------------------------------

const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    window.location.href = "login.html";
    throw new Error("Admin authentication required.");
}


// --------------------------------
// ADMIN DATA
// --------------------------------

const STORAGE_KEY = "gridwatch-townships";

let currentTownships =
    JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
    townships.map((township) => ({
        ...township
    }));


function saveTownships() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(currentTownships)
    );
}


function formatDate(date) {

    return date.toLocaleString(
        "en-ZW",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// --------------------------------
// RENDER TOWNSHIPS
// --------------------------------

function renderTownships() {

    const container =
        document.getElementById("township-list");

    container.innerHTML = "";

    currentTownships.forEach(
        (township, index) => {

            const card =
                document.createElement("div");

            card.className = "admin-card";

            card.innerHTML = `
                <div class="admin-card-header">

                    <div class="admin-township-name">
                        ${township.name}
                    </div>

                    <div
                        class="admin-status ${
                            township.status === "ON"
                                ? "status-on"
                                : "status-off"
                        }"
                    >
                        ${township.status}
                    </div>

                </div>

                <div class="admin-form">

                    <label>
                        STATUS

                        <select
                            class="status-select"
                            data-index="${index}"
                        >

                            <option
                                value="ON"
                                ${
                                    township.status === "ON"
                                        ? "selected"
                                        : ""
                                }
                            >
                                ON
                            </option>

                            <option
                                value="OFF"
                                ${
                                    township.status === "OFF"
                                        ? "selected"
                                        : ""
                                }
                            >
                                OFF
                            </option>

                        </select>

                    </label>

                    <label>
                        REASON

                        <input
                            type="text"
                            class="reason-input"
                            data-index="${index}"
                            value="${township.reason || ""}"
                            placeholder="Reason if power is OFF"
                        >

                    </label>

                    <button
                        class="save-button"
                        data-index="${index}"
                    >
                        SAVE STATUS
                    </button>

                </div>

                <div class="admin-updated">

                    LAST UPDATED

                    <span>
                        ${township.lastUpdated || "Initial status"}
                    </span>

                </div>
            `;

            container.appendChild(card);
        }
    );

    addEventListeners();
}


// --------------------------------
// SAVE BUTTONS
// --------------------------------

function addEventListeners() {

    document
        .querySelectorAll(".save-button")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(button.dataset.index);

                    const status =
                        document.querySelector(
                            `.status-select[data-index="${index}"]`
                        ).value;

                    const reason =
                        document.querySelector(
                            `.reason-input[data-index="${index}"]`
                        ).value.trim();


                    if (
                        status === "OFF" &&
                        reason === ""
                    ) {

                        alert(
                            "Please enter a reason when power is OFF."
                        );

                        return;
                    }


                    currentTownships[index].status =
                        status;


                    currentTownships[index].reason =
                        status === "OFF"
                            ? reason
                            : "";


                    currentTownships[index].lastUpdated =
                        formatDate(new Date());


                    saveTownships();

                    renderTownships();
                }
            );
        });
}


// --------------------------------
// INITIAL RENDER
// --------------------------------

renderTownships();


// --------------------------------
// SIGN OUT
// --------------------------------

document
    .getElementById("logout-button")
    .addEventListener("click", async () => {

        await supabase.auth.signOut();

        window.location.href = "login.html";
    });