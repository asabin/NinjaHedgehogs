// Load Phaser framework dynamically
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js";
script.onload = startGame;
document.head.appendChild(script);

function startGame() {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 1500 },
                debug: false
            }
        },
        scene: { preload, create, update }
    };

    let player, platforms, cursors, gameOverText, deathZone;
    let spaceBar;
    let gamePaused = false;
    let score = 0;
    let scoreText;
    let highScore = 0;  // Add high score variable
    let highScoreText;  // Add high score text variable
    let touchedPlatforms = new Set(); // Track platforms that have been touched
    let bgMusic; // Add background music variable

    const game = new Phaser.Game(config);

    function preload() {
        this.load.image('ninja', 'https://i.imgur.com/njDnKgH.png');
        this.load.image('platformTexture', 'https://i.imgur.com/B0L6RAI.png');
        this.load.image('enemy', 'https://i.imgur.com/HsOUOmi.png');
        
        // Load background layers
        this.load.image('sky', 'https://i.imgur.com/kpYgfC2.png');  // Blue sky with clouds
        this.load.image('buildings', 'https://i.imgur.com/kpYgfC2.png');  // City buildings silhouette
        this.load.image('buildings2', 'https://i.imgur.com/kpYgfC2.png');  // Closer buildings
        
        // Load theme song from an online URL
        this.load.audio('theme', 'assets/audio/theme.mp3');

        // Load jump and land sound effects
        this.load.audio('jump', 'assets/audio/jump.wav');
        this.load.audio('land', 'assets/audio/land.wav');

        // Load smash sound effect
        this.load.audio('smash', 'assets/audio/smash.m4a');
    }

    function create() {
        // Add a darker background gradient for depth
        let background = this.add.graphics();
        background.fillGradientStyle(0x666666, 0x333333, 0x222222, 0x111111, 1);
        background.fillRect(0, 0, window.innerWidth, window.innerHeight);
        background.setScrollFactor(0);
        background.setDepth(-1);

        // Create background layers
        const sky = this.add.tileSprite(0, 0, 12000, 600, 'sky')
            .setOrigin(0, 0)
            .setScrollFactor(0);
        const farBuildings = this.add.tileSprite(0, 0, 12000, 600, 'buildings')
            .setOrigin(0, 0)
            .setScrollFactor(0);
        const nearBuildings = this.add.tileSprite(0, 0, 12000, 600, 'buildings2')
            .setOrigin(0, 0)
            .setScrollFactor(0);
        
        // Store these for use in update
        this.sky = sky;
        this.farBuildings = farBuildings;
        this.nearBuildings = nearBuildings;

        platforms = this.physics.add.staticGroup();
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];

        // Create initial platform at a fixed position
        const startPlatformX = 400;
        const startPlatformY = 500; // Fixed Y position
        
        // Create first platform
        let initPlatform = platforms.create(startPlatformX, startPlatformY, 'platformTexture')
            .setDisplaySize(300, 30)
            .refreshBody();
        initPlatform.setTintFill(parseInt(colors[Phaser.Math.Between(0, colors.length - 1)].slice(1), 16));

        // Create player AFTER first platform but BEFORE other platforms
        player = this.physics.add.sprite(startPlatformX, startPlatformY - 80, 'ninja');
        player.setScale(0.15);
        player.setCollideWorldBounds(false);
        player.setBounce(0);
        player.setDragX(600);
        player.setMaxVelocity(700, 1000);
        player.body.setSize(player.width * 0.7, player.height * 0.8);
        player.body.setOffset(player.width * 0.15, 35);

        // Load the high score from localStorage if it exists
        highScore = localStorage.getItem('platformHighScore') || 0;

        // Current score display with 3D effect - moved even further left
        scoreText = this.add.text(window.innerWidth - 500, 16, 'Platforms: 0', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#0000ff',
            padding: { x: 10, y: 5 },
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 5,
                fill: true
            },
            stroke: '#000',
            strokeThickness: 2
        });
        scoreText.setScrollFactor(0);
        scoreText.setDepth(1);

        // High score display with 3D effect - moved even further left
        highScoreText = this.add.text(window.innerWidth - 500, 66, 'High Score: ' + highScore, {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 },
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 5,
                fill: true
            },
            stroke: '#000',
            strokeThickness: 2
        });
        highScoreText.setScrollFactor(0);
        highScoreText.setDepth(1);

        // Modify the platform collision to track scoring
        this.physics.add.collider(player, platforms, function(player, platform) {
            if (player.body.touching.down && !touchedPlatforms.has(platform)) {
                score++;
                scoreText.setText('Platforms: ' + score);
                touchedPlatforms.add(platform);

                // Update high score if current score is higher
                if (score > highScore) {
                    highScore = score;
                    highScoreText.setText('High Score: ' + highScore);
                    // Save the new high score
                    localStorage.setItem('platformHighScore', highScore);
                }
            }
        });

        // Create rest of platforms
        this.platformList = []; // Store platforms globally for respawn
        let currentX = startPlatformX + 400;
        while (currentX < 11800) {
            let width = Phaser.Math.Between(200, 400);
            let y = Phaser.Math.Between(300, 550);
            let plat = platforms.create(currentX + width / 2, y, 'platformTexture')
                .setDisplaySize(width, 30)
                .refreshBody();
            let color = colors[Phaser.Math.Between(0, colors.length - 1)];
            plat.setTintFill(parseInt(color.slice(1), 16));
            this.platformList.push(plat);
            currentX += Phaser.Math.Between(300, 500);
        }

        deathZone = this.physics.add.staticImage(6000, 610, 'platformTexture')
            .setDisplaySize(12000, 20)
            .refreshBody();
        deathZone.visible = false;

        // Create enemies after platforms
        this.enemies = this.physics.add.group({
            collideWorldBounds: false,
            bounceX: 0,
            bounceY: 0
        });

        this.platformList.forEach((platform) => {
            if (platform !== initPlatform && Math.random() < 0.4) { // 40% chance to spawn an enemy
                let enemy = this.enemies.create(platform.x, platform.y - 40, 'enemy');
                enemy.setScale(0.1);
                enemy.setBounce(0);
                enemy.body.setGravityY(0);
                enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8);
                enemy.body.setOffset(enemy.width * 0.1, enemy.height * 0.2);
                enemy.platform = platform;
                enemy.platformLeft = platform.x - (platform.displayWidth / 2) + 20;
                enemy.platformRight = platform.x + (platform.displayWidth / 2) - 20;
                enemy.active = false;
                enemy.setVelocityX(0);
            }
        });

        // Add colliders BEFORE any movement happens
        this.physics.add.collider(platforms, this.enemies);
        this.physics.add.overlap(player, this.enemies, hitEnemy, null, this);
        
        console.log('Total enemies created:', this.enemies.getChildren().length);

        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        this.physics.world.setBounds(0, 0, 12000, 600);
        this.cameras.main.setBounds(0, 0, 12000, 600);

        cursors = this.input.keyboard.createCursorKeys();
        spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        gameOverText = this.add.text(400, 300, '', {
            fontSize: '64px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 10 }
        });
        gameOverText.setScrollFactor(0);
        gameOverText.setOrigin(0.5);
        gameOverText.setAlpha(0);

        // Add R key for restart
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        
        // Store initial player position for restart
        this.playerStartX = startPlatformX;
        this.playerStartY = startPlatformY - 50;

        // Add instructions text near the start platform
        let instructions = this.add.text(startPlatformX - 140, startPlatformY - 350, 
            'Right Arrow to move right\n Left Arrow to move left\n Space Bar to jump', 
            {
                fontSize: '24px',
                fill: '#fff',
                backgroundColor: '#000',
                padding: { x: 10, y: 10 }
            }
        );
        instructions.setDepth(1); // Make sure text appears above other elements

        // Mark the initial platform as touched so it doesn't count toward the score
        touchedPlatforms.add(initPlatform);

        // Add shadow effect to platforms
        platforms.children.iterate(function(platform) {
            if (platform) {
                // Add drop shadow
                let shadow = this.add.rectangle(
                    platform.x + 5,
                    platform.y + 5,
                    platform.width,
                    platform.height,
                    0x000000,
                    0.3
                );
                shadow.setDepth(platform.depth - 1);
            }
        }, this);

        // Add shadow effect to player
        let playerShadow = this.add.ellipse(
            player.x + 5,
            player.y + 5,
            player.width * 0.8,
            20,
            0x000000,
            0.3
        );
        playerShadow.setDepth(player.depth - 1);

        // Update game loop to move player shadow
        this.events.on('update', function() {
            if (playerShadow && player) {
                playerShadow.x = player.x + 5;
                playerShadow.y = player.y + 5;
            }
        });

        // Add parallax effect to background elements
        let bgElements = this.add.group();
        for (let i = 0; i < 20; i++) {
            let x = Phaser.Math.Between(0, window.innerWidth);
            let y = Phaser.Math.Between(0, window.innerHeight);
            let dot = this.add.circle(x, y, 2, 0xFFFFFF, 0.3);
            dot.setScrollFactor(0.3);
            bgElements.add(dot);
        }

        // Create background music
        bgMusic = this.sound.add('theme', { loop: true, volume: 0.5 });
        
        // Always create touch controls for mobile compatibility
        createTouchControls(this);
    }

    function hitGround() {
        this.physics.world.pause();
        gameOverText.setText("Game Over!");
        gameOverText.setAlpha(1);
        gamePaused = true;
        
        // Stop the music when the player dies by falling
        if (bgMusic.isPlaying) {
            bgMusic.stop();
        }
    }

    function hitEnemy(player, enemy) {
        if (player.body.touching.down && enemy.body.touching.up) {
            enemy.destroy();
            player.setVelocityY(-500);
            this.sound.play('smash');
        } else {
            this.physics.pause();
            gameOverText.setText('Game Over!\nPress R to restart');
            gameOverText.setAlpha(1);
            gamePaused = true;
            
            // Stop the music when the player dies by enemy
            if (bgMusic.isPlaying) {
                bgMusic.stop();
            }
        }
    }

    function update() {
        // Add at the start of the update function
        if (!gamePaused) {
            // Parallax scrolling effect
            this.sky.tilePositionX = this.cameras.main.scrollX * 0.1;
            this.farBuildings.tilePositionX = this.cameras.main.scrollX * 0.4;
            this.nearBuildings.tilePositionX = this.cameras.main.scrollX * 0.7;
        }

        // Add restart check at the beginning of update
        if (this.rKey.isDown) {
            this.physics.resume();
            player.setPosition(this.playerStartX, this.playerStartY);
            player.setVelocity(0, 0);
            gameOverText.setAlpha(0);
            gamePaused = false;
            score = 0;
            touchedPlatforms.clear(); // Clear the set of touched platforms
            touchedPlatforms.add(platforms.getChildren()[0]); // Re-add initial platform
            scoreText.setText('Platforms: 0');
            // Don't reset high score when restarting

            // Respawn enemies
            this.enemies.clear(true, true); // Remove all existing enemies
            this.platformList.forEach((platform) => {
                if (platform !== platforms.getChildren()[0] && Math.random() < 0.4) { // 40% chance to spawn an enemy
                    let enemy = this.enemies.create(platform.x, platform.y - 40, 'enemy');
                    enemy.setScale(0.1);
                    enemy.setBounce(0);
                    enemy.body.setGravityY(0);
                    enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8);
                    enemy.body.setOffset(enemy.width * 0.1, enemy.height * 0.2);
                    enemy.platform = platform;
                    enemy.platformLeft = platform.x - (platform.displayWidth / 2) + 20;
                    enemy.platformRight = platform.x + (platform.displayWidth / 2) - 20;
                    enemy.active = false;
                    enemy.setVelocityX(0);
                }
            });

            return;
        }

        if (gamePaused) return;

        // Start music when player starts moving
        if (!gamePaused && !bgMusic.isPlaying && (cursors.left.isDown || cursors.right.isDown || spaceBar.isDown)) {
            bgMusic.play();
        }

        // Stop music on game over or win
        if (gamePaused && bgMusic.isPlaying) {
            bgMusic.stop();
        }

        if (player.y > window.innerHeight) {
            this.physics.pause();
            gameOverText.setText('Game Over!\nPress R to restart');
            gameOverText.setAlpha(1);
            gamePaused = true;
            
            // Stop the music when the player falls
            if (bgMusic.isPlaying) {
                bgMusic.stop();
            }
            return;
        }

        if (player.x >= 11600) {
            this.physics.world.pause();
            gameOverText.setText("You Win!");
            gameOverText.setAlpha(1);
            gamePaused = true;
            
            // Stop the music when the player wins
            if (bgMusic.isPlaying) {
                bgMusic.stop();
            }
            return;
        }

        // Enemy behavior
        this.enemies.children.iterate(function(enemy) {
            if (!enemy) return;

            // Activate enemy if player is on the same platform
            if (!enemy.active && Math.abs(player.x - enemy.platform.x) < enemy.platform.displayWidth / 2 && 
                Math.abs(player.y - enemy.platform.y) < 50) {
                enemy.active = true;
                enemy.body.setGravityY(1500); // Enable gravity when activated
            }

            // Chase player if active
            if (enemy.active) {
                if (player.x < enemy.x) {
                    enemy.setVelocityX(-150); // Move left toward ninja
                } else if (player.x > enemy.x) {
                    enemy.setVelocityX(150); // Move right toward ninja
                }

                // Keep enemy within platform bounds
                if (enemy.x <= enemy.platformLeft) {
                    enemy.setVelocityX(150);
                } else if (enemy.x >= enemy.platformRight) {
                    enemy.setVelocityX(-150);
                }
            }
        }, this);

        // Handle player movement with keyboard or touch controls
        if (!gamePaused) {
            // Check for keyboard or touch controls
            const leftPressed = cursors.left.isDown || window.touchControls?.left;
            const rightPressed = cursors.right.isDown || window.touchControls?.right;
            const jumpPressed = spaceBar.isDown || window.touchControls?.jump;
            
            if (leftPressed) {
                player.setVelocityX(-500);
                player.flipX = true;
                
                // Start music when player moves
                if (bgMusic && !bgMusic.isPlaying) {
                    bgMusic.play();
                }
            } else if (rightPressed) {
                player.setVelocityX(500);
                player.flipX = false;
                
                // Start music when player moves
                if (bgMusic && !bgMusic.isPlaying) {
                    bgMusic.play();
                }
            } else {
                player.setVelocityX(0);
            }
            
            // Handle jumping with keyboard or touch
            if (jumpPressed && player.body.touching.down) {
                player.setVelocityY(-900);
                this.sound.play('jump');
                
                // Start music when player jumps
                if (bgMusic && !bgMusic.isPlaying) {
                    bgMusic.play();
                }
            }
        }

        // Handle restart with keyboard or touch
        if ((this.rKey.isDown || window.touchControls?.restart) && gamePaused) {
            resetGame(this);
        }
    }

    // Add window resize handler
    window.addEventListener('resize', function() {
        if (game) {
            game.scale.resize(window.innerWidth, window.innerHeight);
            scoreText.setPosition(window.innerWidth - 300, 16); // Update score position on resize
        }
    });

    // Add this to your CSS
    function addFullscreenStyles() {
        const style = document.createElement('style');
        style.textContent = `
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            canvas {
                width: 100%;
                height: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    // Call this before starting the game
    addFullscreenStyles();
}

// Function to create touch controls
function createTouchControls(scene) {
    // Calculate button positions - place them higher up
    const buttonY = window.innerHeight - 150;
    
    // Initialize touch controls if not already done
    if (!window.touchControls) {
        window.touchControls = {
            left: false,
            right: false,
            jump: false,
            restart: false
        };
    }
    
    // Create button backgrounds with higher depth values
    const leftBtnBg = scene.add.rectangle(80, buttonY, 80, 80, 0x000000, 0.7)
        .setScrollFactor(0)
        .setDepth(1000);
    
    const rightBtnBg = scene.add.rectangle(180, buttonY, 80, 80, 0x000000, 0.7)
        .setScrollFactor(0)
        .setDepth(1000);
    
    const jumpBtnBg = scene.add.rectangle(window.innerWidth - 80, buttonY, 80, 80, 0x000000, 0.7)
        .setScrollFactor(0)
        .setDepth(1000);
        
    // Add restart button
    const restartBtnBg = scene.add.rectangle(window.innerWidth - 180, buttonY, 80, 80, 0x000000, 0.7)
        .setScrollFactor(0)
        .setDepth(1000);
    
    // Create button text with larger, more visible font and higher depth
    const leftBtn = scene.add.text(80, buttonY, '←', {
        font: '48px Arial',
        fill: '#ffffff'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
    
    const rightBtn = scene.add.text(180, buttonY, '→', {
        font: '48px Arial',
        fill: '#ffffff'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
    
    const jumpBtn = scene.add.text(window.innerWidth - 80, buttonY, '↑', {
        font: '48px Arial',
        fill: '#ffffff'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
        
    // Add restart button text
    const restartBtn = scene.add.text(window.innerWidth - 180, buttonY, 'R', {
        font: '48px Arial',
        fill: '#ffffff'
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
    
    // Make all interactive areas larger and more responsive
    leftBtnBg.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 160, 160), Phaser.Geom.Rectangle.Contains);
    rightBtnBg.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 160, 160), Phaser.Geom.Rectangle.Contains);
    jumpBtnBg.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 160, 160), Phaser.Geom.Rectangle.Contains);
    restartBtnBg.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 160, 160), Phaser.Geom.Rectangle.Contains);
    
    // Add touch events for left button
    leftBtnBg.on('pointerdown', () => {
        window.touchControls.left = true;
        leftBtnBg.fillColor = 0x444444;
    });
    leftBtnBg.on('pointerup', () => {
        window.touchControls.left = false;
        leftBtnBg.fillColor = 0x000000;
    });
    leftBtnBg.on('pointerout', () => {
        window.touchControls.left = false;
        leftBtnBg.fillColor = 0x000000;
    });
    
    // Add touch events for right button
    rightBtnBg.on('pointerdown', () => {
        window.touchControls.right = true;
        rightBtnBg.fillColor = 0x444444;
    });
    rightBtnBg.on('pointerup', () => {
        window.touchControls.right = false;
        rightBtnBg.fillColor = 0x000000;
    });
    rightBtnBg.on('pointerout', () => {
        window.touchControls.right = false;
        rightBtnBg.fillColor = 0x000000;
    });
    
    // Add touch events for jump button
    jumpBtnBg.on('pointerdown', () => {
        window.touchControls.jump = true;
        jumpBtnBg.fillColor = 0x444444;
    });
    jumpBtnBg.on('pointerup', () => {
        window.touchControls.jump = false;
        jumpBtnBg.fillColor = 0x000000;
    });
    jumpBtnBg.on('pointerout', () => {
        window.touchControls.jump = false;
        jumpBtnBg.fillColor = 0x000000;
    });
    
    // Add touch events for restart button
    restartBtnBg.on('pointerdown', () => {
        window.touchControls.restart = true;
        restartBtnBg.fillColor = 0x444444;
        
        // Directly call resetGame function when restart button is pressed
        resetGame(scene);
    });
    restartBtnBg.on('pointerup', () => {
        window.touchControls.restart = false;
        restartBtnBg.fillColor = 0x000000;
    });
    restartBtnBg.on('pointerout', () => {
        window.touchControls.restart = false;
        restartBtnBg.fillColor = 0x000000;
    });
    
    // Store references to the buttons in the scene
    scene.touchButtons = {
        leftBtn,
        rightBtn,
        jumpBtn,
        restartBtn,
        leftBtnBg,
        rightBtnBg,
        jumpBtnBg,
        restartBtnBg
    };
    
    // Enable multi-touch
    scene.input.addPointer(3); // Support up to 4 simultaneous touches
}

// Make sure resetGame function is properly defined and accessible
function resetGame(scene) {
    // Reset game state
    gamePaused = false;
    
    // Reset player position
    player.setPosition(100, 450);
    player.setVelocity(0, 0);
    
    // Reset camera
    scene.cameras.main.resetFX();
    
    // Hide game over text
    gameOverText.setAlpha(0);
    
    // Resume physics
    scene.physics.resume();
    
    // Reset any other game state as needed
    
    // If music was playing and stopped, restart it
    if (bgMusic && !bgMusic.isPlaying) {
        bgMusic.play();
    }
}

