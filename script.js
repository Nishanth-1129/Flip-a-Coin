const button = document.querySelector('#flip');
const status = document.querySelector('#status');
const coin = document.querySelector('#coin'); 

function processResult(result) {
    status.innerText = "It's " + result.toUpperCase() + "!";
    button.disabled = false; 
}

function flipCoin() {
    // 1. Reset state & stop previous animations
    coin.style.animation = 'none';
    // This line "forces a reflow" - it's a magic trick to restart CSS animations
    coin.offsetWidth; 
    coin.style.animation = null; 
    
    coin.className = ''; 
    status.innerText = "Flipping...";
    button.disabled = true; 

    // 2. Determine result
    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    // 3. Trigger animation
    // Use requestAnimationFrame for smoother performance than a 100ms timeout
    requestAnimationFrame(() => {
        coin.classList.add('animate-' + result);
        
        // 4. Show result after animation (matching your 3s CSS duration)
        setTimeout(() => {
            processResult(result);
        }, 2900);
    });
}

button.addEventListener('click', flipCoin);
