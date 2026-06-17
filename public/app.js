document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
    // 1. Prevent the browser from refreshing the page automatically
    e.preventDefault();

    // 2. Grab our UI elements for status reporting
    const alertBox = document.getElementById('alertBox');
    const receiptCard = document.getElementById('receiptCard');
    const resTxId = document.getElementById('resTxId');
    const resCost = document.getElementById('resCost');
    const resNumbers = document.getElementById('resNumbers');

    // Reset UI visibility states on every fresh submission
    alertBox.className = 'alert d-none';
    receiptCard.classList.add('d-none');
    resNumbers.innerHTML = '';

    // 3. Extract inputs directly from our HTML DOM form
    const payload = {
        buyerName: document.getElementById('buyerName').value,
        buyerEmail: document.getElementById('buyerEmail').value,
        buyerPhone: document.getElementById('buyerPhone').value,
        isOver18: document.getElementById('isOver18').checked,
        ticketsPurchased: document.getElementById('ticketsPurchased').value
    };

    try {
        // 4. Dispatch the payload live to your working Node/Express backend!
        // We use relative paths since our server is now serving the public folder natively
        const response = await fetch('/api/tickets/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 5. Handle server errors smoothly (e.g. Under 18 or sold out limits)
        if (!data.success) {
            alertBox.textContent = data.message || 'Transaction processing failed.';
            alertBox.className = 'alert alert-danger';
            return;
        }

        // 6. UI Rendering: Populate and reveal the clean dynamic receipt framework
        alertBox.textContent = '🎉 ' + data.message;
        alertBox.className = 'alert alert-success';

        resTxId.textContent = data.transactionId;
        resCost.textContent = data.totalCost;

        // Loop through our array of randomized ticket numbers and render badge capsules
        data.assignedNumbers.forEach(num => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary fs-5 px-3 py-2 m-1 shadow-sm';
            badge.textContent = num;
            resNumbers.appendChild(badge);
        });

        // Make the receipt card smoothly visible to our user
        receiptCard.classList.remove('d-none');

        // Reset the input fields so the form is ready for the next person
        document.getElementById('purchaseForm').reset();

    } catch (error) {
        console.error('Frontend Fetch Error:', error);
        alertBox.textContent = 'Network communication failure. Ensure your local backend server is running.';
        alertBox.className = 'alert alert-danger';
    }
});