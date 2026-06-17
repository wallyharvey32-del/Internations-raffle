// 🔄 Function to fetch metrics and load up the full audit table
async function loadDashboardData() {
    try {
        const response = await fetch('/api/tickets/dashboard-stats');
        const data = await response.json();

        if (!data.success) return;

        // Populate upper status cards
        if(document.getElementById('statRevenue')) document.getElementById('statRevenue').textContent = `$${data.revenue}.00 AUD`;
        if(document.getElementById('statTicketsSold')) document.getElementById('statTicketsSold').textContent = `${data.ticketsSold} / ${data.totalPool}`;
        if(document.getElementById('statTicketsLeft')) document.getElementById('statTicketsLeft').textContent = data.ticketsRemaining;

        const ledgerBody = document.getElementById('ledgerBody');
        if (!ledgerBody) return;
        
        ledgerBody.innerHTML = '';

        if (data.transactions.length === 0) {
            ledgerBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No raffle transactions logged yet.</td></tr>`;
            return;
        }

        // Populate master transaction table
        data.transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-bold ps-3">${tx.buyerName}</td>
                <td>
                    <small class="d-block text-dark">${tx.buyerPhone}</small>
                    <small class="text-muted d-block" style="font-size: 11px;">${tx.buyerEmail}</small>
                </td>
                <td class="text-center"><span class="badge bg-light text-dark border px-2.5 py-1.5">${tx.ticketsPurchased}</span></td>
                <td class="text-end fw-bold text-success pe-3">$${tx.totalCost}.00</td>
            `;
            ledgerBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error hydrating administrative data matrix:', error);
    }
}

// 🎯 Event listener to link the Grand Prize Selection Trigger (SECURE PASS-THROUGH)
document.getElementById('btnDraw').addEventListener('click', async () => {
    
    if (!confirm('Are you absolutely certain you want to draw a winner right now?')) return;

    const managerAuthCode = prompt('⚠️ AUTHORIZATION REQUIRED\nPlease enter the secret Administrative Draw Code to unlock the engine:');
    if (managerAuthCode === null) return; 

    // 3. Execution: Hits the backend to pick a random sold ticket
    try {
        const response = await fetch('/api/tickets/draw-winner', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ managerAuthCode })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert(data.message);
            return;
        }

        // 👉 Declared ONCE safely right here
        const displayBox = document.getElementById('winnerDisplay');
        if (displayBox) displayBox.classList.remove('d-none');

        // Before we update the spotlight, take the *previous* spotlight winner (if any) and move them down to history
        const oldTicket = document.getElementById('spotlightTicket').textContent;
        const oldName = document.getElementById('spotlightName').textContent;
        const oldContact = document.getElementById('spotlightContact').textContent;

        if (oldTicket && oldTicket !== "#0000") {
            const historyRow = document.createElement('div');
            historyRow.className = "history-winner-row p-2 mb-2 bg-white rounded border text-start small d-flex justify-content-between align-items-center opacity-75";
            historyRow.innerHTML = `
                <div>
                    <strong class="text-dark">${oldTicket}</strong> — ${oldName} 
                    <br><span class="text-muted" style="font-size:11px;">${oldContact}</span>
                </div>
                <span class="badge bg-secondary">Past Draw</span>
            `;
            const historyList = document.getElementById('winnerHistoryList');
            if (historyList) historyList.insertBefore(historyRow, historyList.firstChild);
        }

        // Slap the BRAND NEW winner right into the glorious center spotlight
        document.getElementById('spotlightTicket').textContent = `#${data.winningNumber || data.number}`;
        document.getElementById('spotlightName').textContent = data.winnerDetails?.name || 'Unknown Buyer';
        document.getElementById('spotlightContact').textContent = `Phone: ${data.winnerDetails?.phone || 'N/A'} | Email: ${data.winnerDetails?.email || 'N/A'}`;
        
    } catch (error) {
        console.error('Draw Endpoint Communication Fault:', error);
        alert('Communication fault: Check your node backend console.');
    }
});

// Run once immediately when the page loads
loadDashboardData();

// 🔄 Auto-Sync Engine: Silently refresh the stats cards and ledger table every 5 seconds
setInterval(() => {
    loadDashboardData();
}, 5000);