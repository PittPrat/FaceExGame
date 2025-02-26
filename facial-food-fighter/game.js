// Facial Food Fighter MVP
// Main game logic using face-api.js for facial detection

// Initialize required variables
let canvas, ctx, video, facialLandmarks;
let score = 0;
let gameActive = false;
let foods = [];
let lastExpressionTime = 0;
const expressionCooldown = 1000; // 1 second cooldown between expressions
let currentExpression = null;

// Food types and their properties
const foodTypes = {
  // Healthy foods (to eat)
  apple: {
    type: 'healthy',
    requiredExpression: 'cheekLifter', // Smile with raised cheeks
    points: 10,
    size: 60,
    image: 'apple.png'
  },
  broccoli: {
    type: 'healthy',
    requiredExpression: 'lionYawn', // Open mouth wide
    points: 10,
    size: 70,
    image: 'broccoli.png'
  },
  
  // Junk foods (to reject)
  donut: {
    type: 'junk',
    requiredExpression: 'eyebrowRaiser', // Raised eyebrows
    points: 10,
    size: 65,
    image: 'donut.png'
  },
  soda: {
    type: 'junk',
    requiredExpression: 'puffedCheeks', // Puffed cheeks to blow away
    points: 10,
    size: 75,
    image: 'soda.png'
  }
};

// Initialize the game
async function init() {
  // Setup canvas
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Setup video
  video = document.getElementById('video');
  
  // Load face-api.js models
  await loadFaceApiModels();
  
  // Setup UI
  document.getElementById('startButton').addEventListener('click', startGame);
  
  // Show instructions initially
  showInstructions();
}

// Load face-api.js models
async function loadFaceApiModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('/models');
}

// Start webcam stream
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      }
    });
    video.srcObject = stream;
    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Error starting webcam:', error);
    showError('Could not access your camera. Please allow camera access and reload the page.');
  }
}

// Show instructions
function showInstructions() {
  const instructionsDiv = document.getElementById('instructions');
  instructionsDiv.innerHTML = `
    <h2>How to Play Facial Food Fighter</h2>
    <div class="instruction">
      <img src="images/cheek-lifter.png" alt="Cheek Lifter">
      <p>Smile with raised cheeks to eat <strong>Apples</strong></p>
    </div>
    <div class="instruction">
      <img src="images/lion-yawn.png" alt="Lion's Yawn">
      <p>Open your mouth wide to eat <strong>Broccoli</strong></p>
    </div>
    <div class="instruction">
      <img src="images/eyebrow-raiser.png" alt="Eyebrow Raiser">
      <p>Raise your eyebrows to reject <strong>Donuts</strong></p>
    </div>
    <div class="instruction">
      <img src="images/puffed-cheeks.png" alt="Puffed Cheeks">
      <p>Puff your cheeks to reject <strong>Soda</strong></p>
    </div>
    <p>Click Start when you're ready!</p>
  `;
  instructionsDiv.style.display = 'block';
}

// Start the game
async function startGame() {
  document.getElementById('instructions').style.display = 'none';
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('gameUI').style.display = 'block';
  
  score = 0;
  foods = [];
  updateScore();
  
  // Start webcam if not already started
  if (!video.srcObject) {
    await startWebcam();
  }
  
  // Play video
  await video.play();
  
  // Resize canvas to match video dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Start game loop
  gameActive = true;
  requestAnimationFrame(gameLoop);
  
  // Start spawning foods
  spawnFood();
  
  // Start face detection
  detectFace();
}

// Game loop
function gameLoop() {
    if (!gameActive) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Brighten the display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // White overlay with 30% opacity
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw foods
    updateFoods();
    
    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    
    // Draw current expression
    if (currentExpression) {
        ctx.fillText(`Current expression: ${currentExpression}`, 10, 60);
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Spawn a new food item
// Spawn a new food item
function spawnFood() {
    if (!gameActive) return;
    
    // Only spawn a new food if there are no foods currently
    if (foods.length === 0) {
      // Select a random food type
      const foodKeys = Object.keys(foodTypes);
      const randomFood = foodKeys[Math.floor(Math.random() * foodKeys.length)];
      const foodInfo = foodTypes[randomFood];
      
      // Create food object
      const food = {
        type: randomFood,
        info: foodInfo,
        x: Math.random() * (canvas.width - foodInfo.size),
        y: -foodInfo.size,
        speedY: 2 + Math.random() * 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        image: new Image()
      };
      
      // Load food image
      food.image.src = `images/${foodInfo.image}`;
      
      // Add to foods array
      foods.push(food);
    }
    
    // Schedule next food spawn attempt
    setTimeout(spawnFood, 1000); // Check every second if we need to spawn a new food
  }

// Update food positions and check for interactions
function updateFoods() {
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    
    // Update position
    food.y += food.speedY;
    food.rotation += food.rotationSpeed;
    
    // Draw food
    ctx.save();
    ctx.translate(food.x + food.info.size/2, food.y + food.info.size/2);
    ctx.rotate(food.rotation);
    ctx.drawImage(food.image, -food.info.size/2, -food.info.size/2, food.info.size, food.info.size);
    ctx.restore();
    
    // Check if food is out of bounds
    if (food.y > canvas.height) {
      // Penalize missed food
      updateScore(-5);
      foods.splice(i, 1);
    }
  }
}

// Face detection
async function detectFace() {
  if (!gameActive) return;
  
  try {
    const detections = await faceapi.detectSingleFace(video, 
      new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    
    if (detections) {
      // Process facial landmarks for custom expressions
      facialLandmarks = detections.landmarks;
      const expressions = detections.expressions;
      
      // Detect custom expressions
      detectCustomExpressions(facialLandmarks, expressions);
      
      // Process expression and interact with foods
      processExpressionAndFoods();
    }
  } catch (error) {
    console.error('Face detection error:', error);
  }
  
  // Continue detection
  setTimeout(detectFace, 100);
}

// Detect custom expressions beyond what face-api provides
function detectCustomExpressions(landmarks, expressions) {
  const now = Date.now();
  
  // Only process new expressions after cooldown
  if (now - lastExpressionTime < expressionCooldown) {
    return;
  }
  
  // Get relevant facial points
  const points = landmarks.positions;
  
  // Detect cheek lifter (smile with raised cheeks)
  if (expressions.happy > 0.7) {
    currentExpression = 'cheekLifter';
    lastExpressionTime = now;
    return;
  }
  
  // Detect lion's yawn (open mouth)
  const mouthOpen = calculateMouthOpenness(points);
  if (mouthOpen > 0.5) {
    currentExpression = 'lionYawn';
    lastExpressionTime = now;
    return;
  }
  
  // Detect eyebrow raiser
  const eyebrowRaised = calculateEyebrowRaise(points);
  if (eyebrowRaised > 0.3 && expressions.surprised > 0.5) {
    currentExpression = 'eyebrowRaiser';
    lastExpressionTime = now;
    return;
  }
  
  // Detect puffed cheeks (this is approximated as it's hard to detect perfectly)
  const cheeksPuffed = calculateCheekPuffiness(points);
  if (cheeksPuffed > 0.4) {
    currentExpression = 'puffedCheeks';
    lastExpressionTime = now;
    return;
  }
  
  // No expression detected
  currentExpression = null;
}

// Calculate mouth openness from facial landmarks
function calculateMouthOpenness(points) {
  // Top lip point and bottom lip point
  const topLip = points[62];
  const bottomLip = points[66];
  
  // Calculate vertical distance
  const distance = Math.abs(topLip.y - bottomLip.y);
  
  // Normalize by face size
  const faceHeight = Math.abs(points[0].y - points[16].y);
  return distance / faceHeight;
}

// Calculate eyebrow raise from facial landmarks
function calculateEyebrowRaise(points) {
  // Eyebrow points and eye points
  const leftEyebrow = points[24];
  const leftEye = points[37];
  const rightEyebrow = points[19];
  const rightEye = points[44];
  
  // Calculate distances
  const leftDistance = Math.abs(leftEyebrow.y - leftEye.y);
  const rightDistance = Math.abs(rightEyebrow.y - rightEye.y);
  
  // Normalize by face size
  const faceHeight = Math.abs(points[0].y - points[16].y);
  return ((leftDistance + rightDistance) / 2) / faceHeight;
}

// Calculate cheek puffiness (this is an approximation)
function calculateCheekPuffiness(points) {
  // Cheek points
  const leftCheek = points[2];
  const rightCheek = points[14];
  const jawCenter = points[8];
  
  // Calculate horizontal width
  const faceWidth = Math.abs(leftCheek.x - rightCheek.x);
  const normalWidth = Math.abs(points[0].x - points[16].x);
  
  return faceWidth / normalWidth;
}

// Process current expression and interact with foods
function processExpressionAndFoods() {
  if (!currentExpression) return;
  
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    
    // Check if expression matches the required expression for this food
    if (currentExpression === food.info.requiredExpression) {
      // Check if the action is correct (eat healthy, reject junk)
      const isCorrectAction = 
        (food.info.type === 'healthy' && 
         (currentExpression === 'cheekLifter' || currentExpression === 'lionYawn')) ||
        (food.info.type === 'junk' && 
         (currentExpression === 'eyebrowRaiser' || currentExpression === 'puffedCheeks'));
      
      if (isCorrectAction) {
        // Success! Add points
        updateScore(food.info.points);
        
        // Show success animation
        showFeedback(food, true);
        
        // Remove food
        foods.splice(i, 1);
      } else {
        // Wrong action! Penalize
        updateScore(-food.info.points);
        
        // Show failure animation
        showFeedback(food, false);
        
        // Remove food
        foods.splice(i, 1);
      }
    }
  }
}

// Show feedback animation
function showFeedback(food, success) {
  // Create a div for feedback animation
  const feedback = document.createElement('div');
  feedback.className = success ? 'feedback success' : 'feedback failure';
  feedback.innerText = success ? '+' + food.info.points : '-' + food.info.points;
  feedback.style.left = food.x + 'px';
  feedback.style.top = food.y + 'px';
  
  document.getElementById('feedbackContainer').appendChild(feedback);
  
  // Remove after animation completes
  setTimeout(() => {
    feedback.remove();
  }, 1000);
}

// Update score
function updateScore(points = 0) {
  score += points;
  document.getElementById('scoreDisplay').innerText = score;
  
  // Check for game over (if score goes too low)
  if (score < -50) {
    gameOver();
  }
}

// Game over
function gameOver() {
  gameActive = false;
  
  document.getElementById('gameUI').style.display = 'none';
  document.getElementById('gameOver').style.display = 'block';
  document.getElementById('finalScore').innerText = score;
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.innerText = message;
  errorDiv.style.display = 'block';
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);