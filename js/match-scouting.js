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
        { title: "Endgame",subtitle: "Pick tower level and hub shot during endgame." },
        { title: "Misc/Submit", subtitle: "Ratings, rankings, comments, then submit." },
    ];

    const state = {
        screen: 0,
        rank: null,
        speed: null,
        selectedTeam: null,
        loadedTeams: [],
        startPos: null,
        bumpTrench: null,
        autoTower: null,
        teleopTower: null,
        shotInHub: null,
        affectedByDefense: null,
        crossedBump: null,
        crossedTrench: null,
        excessivePenalties: null,
        driverSkill: null,
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
        if (state.screen === 3 && !validateEndgame()) return;

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
        $("fuelNeutralZone").checked = false;
        $("fuelOutpost").checked = false;
        $("fuelDepot").checked = false;
        $("fuelFloor").checked = false;
        $("teleopFuelNeutralZone").checked = false;
        $("teleopFuelOutpost").checked = false;
        $("teleopFuelDepot").checked = false;
        $("teleopFuelFloor").checked = false;

        $("autoFuel").value = "";
        $("teleopFuelActive").value = "";
        $("teleopFuelInactive").value = "";

        state.startPos = null;
        state.bumpTrench = null;
        state.autoTower = null;
        state.teleopTower = null;
        state.shotInHub = null;
        state.affectedByDefense = null;
        state.crossedBump = null;
        state.crossedTrench = null;
        state.excessivePenalties = null;
        state.speed = null;

        $("autoEffectiveness").value = "";
        $("teleopActiveEffectiveness").value = "";
        $("teleopInactiveEffectiveness").value = "";
        $("endgameEffectiveness").value = "";
        state.rank = null;

        $("studentName").value = name;
        $("scoutTeam").value = team;

        renderSegments();
        showScreen(0);
    }

    function getRangeMidpoint(rangeStr) {
        if (!rangeStr) return 0;
        const parts = rangeStr.split("-");
        if (parts.length !== 2) return 0;
        const low = Number(parts[0]);
        const high = Number(parts[1]);
        return Math.round((low + high) / 2);
    }

    $("autoFuel").addEventListener("change", updateEstimate);
    $("teleopFuelActive").addEventListener("change", updateEstimate);

    function renderSegments(){
        document.querySelectorAll("#fieldSelector .field-position").forEach(pos=>{
            pos.classList.toggle("active", pos.dataset.value === state.startPos);
        });
        document.querySelectorAll("#bumpTrenchSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.bumpTrench);
        });
        document.querySelectorAll("#autoTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.autoTower);
        });
        document.querySelectorAll("#teleopTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.teleopTower);
        });
        document.querySelectorAll("#shotInHubSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.shotInHub);
        });
        document.querySelectorAll("#affectedByDefenseSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.affectedByDefense);
        });
        document.querySelectorAll("#crossedBumpSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.crossedBump);
        });
        document.querySelectorAll("#crossedTrenchSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.crossedTrench);
        });
        document.querySelectorAll("#excessivePenaltiesSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.excessivePenalties);
        });
        document.querySelectorAll("#speedSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.speed);
        });
        document.querySelectorAll("#driverSkillSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.driverSkill);
        });
        document.querySelectorAll("#rankSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.rank);
        });
    }

    document.querySelectorAll("#fieldSelector .field-position").forEach(pos=>{
        pos.addEventListener("click", ()=>{
            state.startPos = pos.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#bumpTrenchSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.bumpTrench = ch.dataset.value;
            renderSegments();
        });
    });
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
    document.querySelectorAll("#shotInHubSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.shotInHub = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#affectedByDefenseSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.affectedByDefense = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#crossedBumpSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.crossedBump = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#crossedTrenchSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.crossedTrench = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#excessivePenaltiesSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.excessivePenalties = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#speedSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.speed = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#driverSkillSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.driverSkill = ch.dataset.value;
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
        const autoFuelMid = getRangeMidpoint($("autoFuel").value);
        const teleopFuelActiveMid = getRangeMidpoint($("teleopFuelActive").value);

        const pts =
            autoFuelMid +
            teleopFuelActiveMid +
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
        if (state.startPos === null){ toast("⚠️ Select where robot starts"); return false; }
        if (!$("autoFuel").value){ toast("⚠️ Select auto fuel range"); return false; }
        if (state.autoTower === null){ toast("⚠️ Select auto tower level"); return false; }
        return true;
    }

    function validateTeleop(){
        const shuttling = $("shuttling").value;

        if (!$("teleopFuelActive").value){ toast("⚠️ Select teleop fuel (active hub) range"); return false; }
        if (!shuttling){ toast("⚠️ Select shuttling rating"); return false; }
        return true;
    }

    function validateEndgame(){
        if (state.teleopTower === null){ toast("⚠️ Select endgame tower level"); return false; }
        if (state.shotInHub === null){ toast("⚠️ Select shot in hub"); return false; }
        return true;
    }

    function validateMisc(){
        const defense = $("defenseRating").value;
        const status = $("robotStatus").value;

        if (state.affectedByDefense === null){ toast("⚠️ Select if team was affected by defense"); return false; }
        if (!status){ toast("⚠️ Select robot status"); return false; }
        if (!defense){ toast("⚠️ Select defense rating"); return false; }
        if (state.speed === null){ toast("⚠️ Select speed rating"); return false; }
        if (state.driverSkill === null){ toast("⚠️ Select driver skill"); return false; }
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

            startPos: state.startPos || "",
            autoFuelRange: getVal("autoFuel"),
            autoTower: state.autoTower || "NONE",
            autoTowerPoints: towerPointsAuto(state.autoTower),

            teleopFuelActiveRange: getVal("teleopFuelActive"),
            teleopFuelInactiveRange: getVal("teleopFuelInactive"),
            fuelNeutralZone: $("fuelNeutralZone").checked,
            fuelOutpost: $("fuelOutpost").checked,
            fuelDepot: $("fuelDepot").checked,
            fuelFloor: $("fuelFloor").checked,
            bumpTrench: state.bumpTrench || "",
            teleopFuelNeutralZone: $("teleopFuelNeutralZone").checked,
            teleopFuelOutpost: $("teleopFuelOutpost").checked,
            teleopFuelDepot: $("teleopFuelDepot").checked,
            teleopFuelFloor: $("teleopFuelFloor").checked,
            shuttling: getVal("shuttling"),

            teleopTower: state.teleopTower || "NONE",
            teleopTowerPoints: towerPointsTeleop(state.teleopTower),
            shotInHub: state.shotInHub || "",
            affectedByDefense: state.affectedByDefense || "",
            crossedBump: state.crossedBump || "",
            crossedTrench: state.crossedTrench || "",
            excessivePenalties: state.excessivePenalties || "",
            autoEffectiveness: getVal("autoEffectiveness"),
            teleopActiveEffectiveness: getVal("teleopActiveEffectiveness"),
            teleopInactiveEffectiveness: getVal("teleopInactiveEffectiveness"),
            endgameEffectiveness: getVal("endgameEffectiveness"),
            robotStatus: getVal("robotStatus"),
            defenseRating: getVal("defenseRating"),
            speed: state.speed || "",
            driverSkill: state.driverSkill || "",
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
        if (!validateMisc()) return;

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