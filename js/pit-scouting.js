(function() {
    "use strict";

    const CONFIG = {
        WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbzG1s4QLO2iym5FnLcWM5sFTUDWnovIm0zMRDBQ4rWCpRxBLpk3STqDr9uRKDWsyR1H/exec",
        TBA_API_KEY: "QbQkb0gqMlzea1xJM9Mo81lCIEFeHcHduBAj4X2M2SJZI7d7rhxXpHepMhseNOdZ",
        EVENT_KEY: "2026wiapp",
        ENABLE_TEAM_LOADING: true
    };

    const TBA_TEAMS_AT_EVENT = (eventKey) =>
        `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}/teams/simple`;

    const SCREENS = [
        { title: "Team Information", subtitle: "Enter scout and team details" },
        { title: "Robot Design", subtitle: "Drivetrain, motors, dimensions, and features" },
        { title: "Strategy & Experience", subtitle: "Auto, capabilities, and team notes" },
    ];

    const state = {
        screen: 0,
        selectedTeam: null,
        selectedTeamName: "",
        loadedTeams: [],
        canClimb: null,
        position: null,
        impression: null,
    };

    const $ = (id) => document.getElementById(id);
    const toastEl = $("toast");

    function toast(msg){
        toastEl.textContent = msg;
        toastEl.style.display = "block";
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(()=>toastEl.style.display="none", 2500);
    }

    function updateOnline(){
        const online = navigator.onLine;
        $("netDot").classList.toggle("ok", online);
        $("netDot").classList.toggle("bad", !online);
        $("netText").textContent = online ? "Online" : "Offline";
    }
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    function updateProgress(){
        document.querySelectorAll(".progress .step").forEach((step, i)=>{
            step.classList.toggle("complete", i < state.screen);
            step.classList.toggle("active", i === state.screen);
        });
    }

    function showScreen(i){
        state.screen = i;

        document.querySelectorAll(".screen").forEach(sec=>{
            sec.style.display = (Number(sec.dataset.screen) === i) ? "block" : "none";
        });

        $("screenTitle").textContent = SCREENS[i].title;
        $("screenSubtitle").textContent = SCREENS[i].subtitle;

        $("btnBack").style.display = (i === 0) ? "none" : "inline-flex";
        $("btnNext").style.display = (i === SCREENS.length - 1) ? "none" : "inline-flex";
        $("btnSubmit").style.display = (i === SCREENS.length - 1) ? "inline-flex" : "none";

        updateProgress();
    }

    $("btnBack").addEventListener("click", ()=> showScreen(Math.max(0, state.screen - 1)));
    $("btnNext").addEventListener("click", ()=>{
        if (state.screen === 0 && !validateTeamInfo()) return;
        if (state.screen === 1 && !validateRobotDesign()) return;

        showScreen(Math.min(SCREENS.length - 1, state.screen + 1));
    });

    $("btnReset").addEventListener("click", ()=>{
        if (!confirm("Reset this pit scouting entry?")) return;
        resetEntry();
        toast("✓ Reset complete");
    });

    function resetEntry(){
        const name = $("scoutName").value;

        $("teamSearch").value = "";
        $("teamName").value = "";
        state.selectedTeam = null;
        state.selectedTeamName = "";

        $("drivetrain").value = "";
        $("motorType").value = "";
        $("width").value = "";
        $("length").value = "";
        $("height").value = "";
        $("weight").value = "";
        $("programmingLang").value = "";
        $("specialFeatures").value = "";

        $("autoStrategy").value = "";
        $("fuelCapacity").value = "";
        $("cycleTime").value = "";
        $("defenseCap").value = "";
        $("experience").value = "";
        $("workingOn").value = "";
        $("additionalNotes").value = "";

        state.canClimb = null;
        state.position = null;
        state.impression = null;

        $("scoutName").value = name;

        renderSegments();
        showScreen(0);
    }

    function renderSegments(){
        document.querySelectorAll("#canClimbSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.canClimb);
        });
        document.querySelectorAll("#positionSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.position);
        });
        document.querySelectorAll("#impressionSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.impression);
        });
    }

    document.querySelectorAll("#canClimbSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.canClimb = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#positionSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.position = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#impressionSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.impression = ch.dataset.value;
            renderSegments();
        });
    });

    function validateTeamInfo(){
        const name = $("scoutName").value.trim();

        if (!name){ toast("⚠️ Enter scout name"); return false; }
        if (!state.selectedTeam){ toast("⚠️ Select a team from the list"); return false; }

        return true;
    }

    function validateRobotDesign(){
        const drivetrain = $("drivetrain").value;
        const motorType = $("motorType").value;
        const programmingLang = $("programmingLang").value;

        if (!drivetrain){ toast("⚠️ Select drivetrain type"); return false; }
        if (!motorType){ toast("⚠️ Select motor type"); return false; }
        if (!programmingLang){ toast("⚠️ Select programming language"); return false; }
        if (state.canClimb === null){ toast("⚠️ Indicate if robot can climb"); return false; }

        return true;
    }

    function validateStrategy(){
        const autoStrategy = $("autoStrategy").value;
        const fuelCapacity = $("fuelCapacity").value;
        const cycleTime = $("cycleTime").value;
        const defenseCap = $("defenseCap").value;
        const experience = $("experience").value;

        if (!autoStrategy){ toast("⚠️ Select auto strategy"); return false; }
        if (!fuelCapacity){ toast("⚠️ Select fuel capacity"); return false; }
        if (!cycleTime){ toast("⚠️ Select cycle time"); return false; }
        if (!defenseCap){ toast("⚠️ Select defense capability"); return false; }
        if (!experience){ toast("⚠️ Select team experience"); return false; }
        if (state.position === null){ toast("⚠️ Select preferred position"); return false; }
        if (state.impression === null){ toast("⚠️ Rate overall impression"); return false; }

        return true;
    }

    async function loadTeams(){
        if (!CONFIG.ENABLE_TEAM_LOADING) {
            console.log("Team loading disabled");
            return;
        }

        try{
            console.log("Loading teams from:", CONFIG.EVENT_KEY);

            const res = await fetch(TBA_TEAMS_AT_EVENT(CONFIG.EVENT_KEY), {
                method: "GET",
                headers: { 'X-TBA-Auth-Key': CONFIG.TBA_API_KEY }
            });

            console.log("TBA Response status:", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("TBA Error:", errorText);
                throw new Error(`HTTP ${res.status}`);
            }

            const arr = await res.json();
            console.log("Teams received:", arr.length);

            state.loadedTeams = arr.map(t => ({
                number: t.team_number,
                name: t.nickname || t.name || `Team ${t.team_number}`
            })).sort((a,b)=>a.number-b.number);

            console.log(`✓ Loaded ${state.loadedTeams.length} teams`);
            toast(`✓ Loaded ${state.loadedTeams.length} teams`);
        }catch(err){
            console.error("Failed to load teams:", err);
            toast("⚠️ Couldn't load teams - you can still enter team numbers");
        }
    }

    const teamSearchInput = $("teamSearch");
    const autocompleteResults = $("autocompleteResults");
    let selectedIndex = -1;

    teamSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (!query) {
            autocompleteResults.classList.remove("show");
            state.selectedTeam = null;
            $("teamName").value = "";
            return;
        }

        const filtered = state.loadedTeams.filter(team => {
            return team.number.toString().includes(query) ||
                team.name.toLowerCase().includes(query);
        }).slice(0, 10);

        if (filtered.length > 0) {
            renderAutocomplete(filtered);
            autocompleteResults.classList.add("show");
            selectedIndex = -1;
        } else {
            autocompleteResults.classList.remove("show");
        }

        state.selectedTeam = null;
        $("teamName").value = "";
    });

    teamSearchInput.addEventListener("keydown", (e) => {
        const items = autocompleteResults.querySelectorAll(".autocomplete-item");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateActiveItem(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateActiveItem(items);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            items[selectedIndex].click();
        } else if (e.key === "Escape") {
            autocompleteResults.classList.remove("show");
            selectedIndex = -1;
        }
    });

    teamSearchInput.addEventListener("blur", () => {
        setTimeout(() => {
            autocompleteResults.classList.remove("show");
            selectedIndex = -1;
        }, 200);
    });

    function renderAutocomplete(teams) {
        autocompleteResults.innerHTML = teams.map((team, i) => `
        <div class="autocomplete-item" data-team="${team.number}">
            <div class="team-num">${team.number}</div>
            <div class="team-name">${team.name}</div>
        </div>
    `).join("");

        autocompleteResults.querySelectorAll(".autocomplete-item").forEach(item => {
            item.addEventListener("click", () => {
                const teamNum = item.dataset.team;
                const team = teams.find(t => t.number.toString() === teamNum);

                teamSearchInput.value = team.number;
                $("teamName").value = team.name;
                state.selectedTeam = team.number;
                state.selectedTeamName = team.name;
                autocompleteResults.classList.remove("show");
            });
        });
    }

    function updateActiveItem(items) {
        items.forEach((item, i) => {
            item.classList.toggle("active", i === selectedIndex);
        });

        if (selectedIndex >= 0 && items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: "nearest" });
        }
    }

    $("btnSubmit").addEventListener("click", submit);

    function buildPayload(){
        const getVal = (id, defaultVal = "") => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : defaultVal;
        };

        return {
            scoutingType: "PIT",
            timestampISO: new Date().toISOString(),
            scoutName: getVal("scoutName"),
            eventCode: CONFIG.EVENT_KEY,
            teamNumber: Number(state.selectedTeam || 0),
            teamName: state.selectedTeamName,

            drivetrain: getVal("drivetrain"),
            motorType: getVal("motorType"),
            width: getVal("width"),
            length: getVal("length"),
            height: getVal("height"),
            weight: getVal("weight"),
            programmingLang: getVal("programmingLang"),
            canClimb: state.canClimb || "No",
            specialFeatures: getVal("specialFeatures"),

            autoStrategy: getVal("autoStrategy"),
            fuelCapacity: getVal("fuelCapacity"),
            cycleTime: getVal("cycleTime"),
            defenseCap: getVal("defenseCap"),
            experience: getVal("experience"),
            preferredPosition: state.position || "Any",
            workingOn: getVal("workingOn"),
            additionalNotes: getVal("additionalNotes"),
            overallImpression: state.impression || "0",
        };
    }

    function queueKey(){ return "scoutQueue_1792_pit_2026"; }

    function getQueue(){
        try{
            return JSON.parse(localStorage.getItem(queueKey()) || "[]");
        }catch{
            return [];
        }
    }
    function setQueue(q){
        localStorage.setItem(queueKey(), JSON.stringify(q));
        updateQueueNote();
    }
    function updateQueueNote(){
        const q = getQueue();
        if (q.length > 0) {
            $("queueAlert").style.display = "block";
            $("queueCount").textContent = q.length;
        } else {
            $("queueAlert").style.display = "none";
        }
    }
    updateQueueNote();

    async function submit(){
        if (!validateTeamInfo()) return;
        if (!validateRobotDesign()) return;
        if (!validateStrategy()) return;

        console.log("Starting submit...");
        $("btnSubmit").disabled = true;
        $("btnSubmit").textContent = "Submitting…";

        const payload = buildPayload();
        console.log("Payload:", payload);

        try{
            await postToWebhook(payload);
            console.log("Submit successful");
            toast("✓ Submitted successfully!");
            resetEntry();
        }catch(err){
            console.error("Submit error:", err);
            const q = getQueue();
            q.push(payload);
            setQueue(q);
            toast("⚠️ Submit failed — saved to queue");
        }finally{
            $("btnSubmit").disabled = false;
            $("btnSubmit").textContent = "Submit";
        }
    }

    async function postToWebhook(payloadObj){
        console.log("Posting to webhook");
        const body = "payload=" + encodeURIComponent(JSON.stringify(payloadObj));

        await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: body
        });

        console.log("Request sent (no-cors mode)");
        return true;
    }

    $("btnResend").addEventListener("click", resendQueued);

    async function resendQueued(){
        const q = getQueue();
        if (!q.length){ toast("Queue is empty"); return; }

        $("btnResend").disabled = true;
        $("btnResend").textContent = "Resending…";

        const remaining = [];
        let sent = 0;

        for (const item of q){
            try{
                await postToWebhook(item);
                sent++;
            }catch{
                remaining.push(item);
            }
        }

        setQueue(remaining);
        $("btnResend").disabled = false;
        $("btnResend").textContent = "Resend All";

        if (sent) toast(`✓ Resent ${sent} submission(s)`);
        else toast("❌ No queued items sent");
    }

    renderSegments();
    showScreen(0);

    loadTeams();
})();