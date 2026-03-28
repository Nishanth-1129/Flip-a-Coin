const button = document.querySelector('#flip');
const status = document.querySelector('#status');
const coin = document.querySelector('#coin'); // Added this missing line

function processResult(result) {
    status.innerText = "It's " + result.toUpperCase() + "!";
    button.disabled = false; // Re-enable button after flip
}

function flipCoin() {
    // 1. Reset state
    coin.className = ''; 
    status.innerText = "Flipping...";
    button.disabled = true; // Prevent double-clicking during animation

    // 2. Determine result
    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    // 3. Trigger animation
    // We use a tiny timeout to allow the browser to register the class removal above
    setTimeout(() => {
        coin.classList.add('animate-' + result);
        
        // 4. Show result after animation (3 seconds)
        setTimeout(() => {
            processResult(result);
        }, 2900);
    }, 100);
}

button.addEventListener('click', flipCoin);
