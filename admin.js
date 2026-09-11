import { supabase } from "./supabase.js";

let currentTownships = [];

const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    window.location.href = "login.html";
    throw new Error("Admin authentication required.");
}

async function loadTownships() {

    const {
        data,
        error
    } = await supabase
        .from("townships")
        .select("*")
        .order("id");

    if (error) {

        console.error(
            "Failed to load townships:",
            error
        );

        return;
    }

    currentTownships = data;

    console.log(
        `${currentTownships.length} townships loaded from Supabase.`
    );

    renderTownships();
}

function formatDate(date) {

    return new Date(date).toLocaleString(
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

function renderTownships() {

    const container =
        document.getElementById("township-list");

    container.innerHTML = "";

    currentTownships.forEach(
        (township) => {

            const card =
                document.createElement("div");

            card.className = "admin-card";

            const lastUpdated =
                township.last_updated
                    ? formatDate(
                        township.last_updated
                    )
                    : "Initial status";

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
                            data-id="${township.id}"
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
                            data-id="${township.id}"
                            value="${township.reason || ""}"
                            placeholder="Reason if power is OFF"
                        >

                    </label>

                    <button
                        class="save-button"
                        data-id="${township.id}"
                    >
                        SAVE STATUS
                    </button>

                </div>

                <div class="admin-updated">

                    LAST UPDATED

                    <span>
                        ${lastUpdated}
                    </span>

                </div>
            `;

            container.appendChild(card);
        }
    );

    addEventListeners();
}

function addEventListeners() {

    document
        .querySelectorAll(".save-button")
        .forEach((button) => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        Number(
                            button.dataset.id
                        );

                    const status =
                        document.querySelector(
                            `.status-select[data-id="${id}"]`
                        ).value;

                    const reason =
                        document.querySelector(
                            `.reason-input[data-id="${id}"]`
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

                    button.disabled = true;

                    button.textContent =
                        "SAVING...";

                    const {
                        error
                    } = await supabase
                        .from("townships")
                        .update({
                            status:
                                status,

                            reason:
                                status === "OFF"
                                    ? reason
                                    : null,

                            last_updated:
                                new Date().toISOString()
                        })
                        .eq("id", id);

                    if (error) {

                        console.error(
                            "Failed to update township:",
                            error
                        );

                        alert(
                            "Unable to save status."
                        );

                        button.disabled = false;

                        button.textContent =
                            "SAVE STATUS";

                        return;
                    }

                    console.log(
                        "Township status updated."
                    );

                    await loadTownships();
                }
            );
        });
}

document
    .getElementById("logout-button")
    .addEventListener(
        "click",
        async () => {

            await supabase.auth.signOut();

            window.location.href =
                "login.html";
        }
    );

loadTownships();