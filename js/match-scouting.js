(function() {
    "use strict";

    const CONFIG = {
        WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwVKT4wl-jc82fLofBrCI3dvI3riILzNbqe6Pjgg5bi6enPN4O13cwQMswfcfxtzjL0/exec",
        TBA_API_KEY: "QbQkb0gqMlzea1xJM9Mo81lCIEFeHcHduBAj4X2M2SJZI7d7rhxXpHepMhseNOdZ",
        EVENT_KEY: "2026wiapp",
        ENABLE_TEAM_LOADING: true
    };

    const TBA_TEAMS_AT_EVENT = (eventKey) =>
        `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}/teams/simple`;

    const SCREENS = [
        { title: "Start",  subtitle: "Enter match info, load teams from an event, then scout." },
        { title: "Auto",   subtitle: "Track auto fuel + auto tower." },
        { title: "Teleop", subtitle: "Track fuel scored during active/inactive hub time and shuttling." },
        { title: "Endgame",subtitle: "Pick tower level, ratings, rank, then submit." },
    ];

    const state = {
        screen: 0,
        rank: null,
        speed: null,
        selectedTeam: null,
        loadedTeams: [],
        counters: {
            autoFuel: 0,
            teleopFuelActive: 0,
            teleopFuelInactive: 0,
        },
        autoTower: null,
        teleopTower: null,
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

        if (i === 3) updateEstimate();
    }

    $("btnBack").addEventListener("click", ()=> showScreen(Math.max(0, state.screen - 1)));
    $("btnNext").addEventListener("click", ()=>{
        if (state.screen === 0 && !validateStart()) return;
        if (state.screen === 1 && !validateAuto()) return;
        if (state.screen === 2 && !validateTeleop()) return;

        showScreen(Math.min(SCREENS.length - 1, state.screen + 1));
    });

    $("btnReset").addEventListener("click", ()=>{
        if (!confirm("Reset this scouting entry?")) return;
        resetEntry();
        toast("✓ Reset complete");
    });

    function resetEntry(){
        const name = $("studentName").value;
        const team = $("scoutTeam").value;

        $("matchNumber").value = "";
        $("teamSearch").value = "";
        state.selectedTeam = null;
        $("alliance").value = "";
        $("shuttling").value = "";
        $("defenseRating").value = "";
        $("robotStatus").value = "";

        state.counters.autoFuel = 0;
        state.counters.teleopFuelActive = 0;
        state.counters.teleopFuelInactive = 0;

        state.autoTower = null;
        state.teleopTower = null;
        state.speed = null;
        state.rank = null;

        $("studentName").value = name;
        $("scoutTeam").value = team;

        renderCounters();
        renderSegments();
        showScreen(0);
    }

    function clamp(n){ return Math.max(0, Number(n||0)); }

    function renderCounters(){
        $("autoFuel").textContent = state.counters.autoFuel;
        $("teleopFuelActive").textContent = state.counters.teleopFuelActive;
        $("teleopFuelInactive").textContent = state.counters.teleopFuelInactive;
        updateEstimate();
    }

    document.addEventListener("click", (e)=>{
        const incKey = e.target.getAttribute("data-inc");
        const decKey = e.target.getAttribute("data-dec");
        if (incKey){
            state.counters[incKey] = clamp(state.counters[incKey] + 1);
            renderCounters();
        }
        if (decKey){
            state.counters[decKey] = clamp(state.counters[decKey] - 1);
            renderCounters();
        }
    });

    function renderSegments(){
        document.querySelectorAll("#autoTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.autoTower);
        });
        document.querySelectorAll("#teleopTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.teleopTower);
        });
        document.querySelectorAll("#speedSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.speed);
        });
        document.querySelectorAll("#rankSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.rank);
        });
    }

    document.querySelectorAll("#autoTowerSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.autoTower = ch.dataset.value;
            renderSegments();
            updateEstimate();
        });
    });
    document.querySelectorAll("#teleopTowerSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.teleopTower = ch.dataset.value;
            renderSegments();
            updateEstimate();
        });
    });
    document.querySelectorAll("#speedSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.speed = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#rankSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.rank = ch.dataset.value;
            renderSegments();
        });
    });

    function towerPointsAuto(level){
        if (level === "L1") return 15;
        return 0;
    }
    function towerPointsTeleop(level){
        if (level === "L1") return 10;
        if (level === "L2") return 20;
        if (level === "L3") return 30;
        return 0;
    }
    function updateEstimate(){
        const pts =
            (state.counters.autoFuel * 1) +
            (state.counters.teleopFuelActive * 1) +
            towerPointsAuto(state.autoTower) +
            towerPointsTeleop(state.teleopTower);

        $("estPoints").textContent = pts;
    }

    function validateStart(){
        const name = $("studentName").value.trim();
        const scoutTeam = $("scoutTeam").value;
        const match = Number($("matchNumber").value);
        const alliance = $("alliance").value;

        if (!name){ toast("⚠️ Enter student name"); return false; }
        if (!scoutTeam){ toast("⚠️ Select your team (1792 or 1259)"); return false; }
        if (!match || match < 1){ toast("⚠️ Enter match number"); return false; }
        if (!alliance){ toast("⚠️ Select alliance color"); return false; }
        if (!state.selectedTeam){ toast("⚠️ Select a team from the list"); return false; }

        return true;
    }

    function validateAuto(){
        if (state.autoTower === null){ toast("⚠️ Select auto tower level"); return false; }
        return true;
    }

    function validateTeleop(){
        const shuttling = $("shuttling").value;

        if (!shuttling){ toast("⚠️ Select shuttling rating"); return false; }
        return true;
    }

    function validateEndgame(){
        const defense = $("defenseRating").value;
        const status = $("robotStatus").value;

        if (state.teleopTower === null){ toast("⚠️ Select endgame tower level"); return false; }
        if (!status){ toast("⚠️ Select robot status"); return false; }
        if (!defense){ toast("⚠️ Select defense rating"); return false; }
        if (state.speed === null){ toast("⚠️ Select speed rating"); return false; }
        if (state.rank === null){ toast("⚠️ Rank this robot"); return false; }
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
            return;
        }

        const filtered = state.loadedTeams.filter(team => {
            return team.number.toString().includes(query) ||
                team.name.toLowerCase().includes(query);
        }).slice(0, 15);

        if (filtered.length > 0) {
            renderAutocomplete(filtered);
            autocompleteResults.classList.add("show");
            selectedIndex = -1;
        } else {
            autocompleteResults.classList.remove("show");
        }

        state.selectedTeam = null;
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

                teamSearchInput.value = `${team.number} - ${team.name}`;
                state.selectedTeam = team.number;
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
            return el ? el.value : defaultVal;
        };

        const getText = (id, defaultVal = "0") => {
            const el = document.getElementById(id);
            return el ? el.textContent : defaultVal;
        };

        return {
            timestampISO: new Date().toISOString(),
            studentName: getVal("studentName").trim(),
            scoutTeam: getVal("scoutTeam"),
            eventCode: CONFIG.EVENT_KEY,
            matchNumber: Number(getVal("matchNumber", "0")),
            teamNumber: Number(state.selectedTeam || 0),
            alliance: getVal("alliance"),

            autoFuelActive: Number(state.counters.autoFuel || 0),
            autoTower: state.autoTower || "NONE",
            autoTowerPoints: towerPointsAuto(state.autoTower),

            teleopFuelActive: Number(state.counters.teleopFuelActive || 0),
            teleopFuelInactive: Number(state.counters.teleopFuelInactive || 0),
            shuttling: getVal("shuttling"),

            teleopTower: state.teleopTower || "NONE",
            teleopTowerPoints: towerPointsTeleop(state.teleopTower),
            robotStatus: getVal("robotStatus"),
            defenseRating: getVal("defenseRating"),
            speed: state.speed || "",
            rank: state.rank || "",

            estPoints: Number(getText("estPoints"))
        };
    }

    function queueKey(){ return "scoutQueue_1792_rebuilt_2026"; }

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
        if (!validateStart()) return;
        if (!validateAuto()) return;
        if (!validateTeleop()) return;
        if (!validateEndgame()) return;

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

    renderCounters();
    renderSegments();
    showScreen(0);

    loadTeams();
})();