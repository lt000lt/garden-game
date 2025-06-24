import React, { useState, useEffect, useCallback } from 'react';
import { Droplets, Coins, Shovel, Sprout } from 'lucide-react';

const GardenGame = () => {
  const GRID_SIZE = 8;
  const INITIAL_MONEY = 50;
  
  // Plant types (replaced tomato with cherry blossom, increased pepper/sunflower/corn values)
  const PLANT_TYPES = {
    carrot: { name: 'Carrot', cost: 25, growthTime: 3000, valueRange: [30, 60], color: '#FF6B35', stages: ['🌱', '🌿', '🥕'] },
    cherry_blossom: { name: 'Cherry Blossom', cost: 30000, growthTime: 12000, valueRange: [45000, 75000], color: '#FFB6C1', stages: ['🌱', '🌿', '🌸'] },
    corn: { name: 'Corn', cost: 5000, growthTime: 8000, valueRange: [7500, 12000], color: '#FFD700', stages: ['🌱', '🌿', '🌽'] },
    sunflower: { name: 'Sunflower', cost: 400, growthTime: 7000, valueRange: [600, 1000], color: '#FFD700', stages: ['🌱', '🌿', '🌻'] },
    pepper: { name: 'Pepper', cost: 10000, growthTime: 5500, valueRange: [15000, 23000], color: '#FF4500', stages: ['🌱', '🌿', '🌶️'] },
    pumpkin: { name: 'Pumpkin', cost: 2000, growthTime: 10000, valueRange: [2500, 4500], color: '#FF8C00', stages: ['🌱', '🌿', '🎃'] }
  };

  // Initialize garden grid
  const initializeGrid = () => {
    return Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({
        plant: null,
        stage: 0,
        plantedAt: null,
        watered: false,
        lastWatered: null,
        waterBonus: false
      }))
    );
  };

  const [grid, setGrid] = useState(initializeGrid);
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [selectedPlant, setSelectedPlant] = useState('carrot');
  const [tool, setTool] = useState('plant');
  const [gameTime, setGameTime] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [sunlightUses, setSunlightUses] = useState(2);
  const [frozenUses, setFrozenUses] = useState(1);
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [plantStock, setPlantStock] = useState(
    Object.keys(PLANT_TYPES).reduce((acc, plant) => ({ ...acc, [plant]: 15 }), {})
  );
  const [powerUpEffects, setPowerUpEffects] = useState({});
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastStockRefresh, setLastStockRefresh] = useState(0);

  // Game loop
  useEffect(() => {
    if (gameEnded) return;
    
    const interval = setInterval(() => {
      setGameTime(prev => {
        const newTime = prev + 100;
        
        // Check plant stock every 30 seconds (30000ms)
        if (newTime % 30000 === 0 && newTime > 0) {
          setPlantStock(prevStock => {
            const newStock = {};
            Object.keys(PLANT_TYPES).forEach(plant => {
              newStock[plant] = 15; // Replenish to 15 stock each
            });
            return newStock;
          });
          setLastStockRefresh(newTime);
        }
        
        if (newTime >= 180000) {
          // Game ended - clear all plants without giving money
          setGrid(initializeGrid());
          setGameEnded(true);
          setShowNameInput(true);
          return 180000;
        }
        
        return newTime;
      });
      
      setGrid(prevGrid => {
        const newGrid = prevGrid.map(row => 
          row.map(cell => {
            if (!cell.plant) return cell;
            
            const plant = PLANT_TYPES[cell.plant];
            const timeSincePlanted = Date.now() - cell.plantedAt;
            
            let newStage = cell.stage;
            const growthProgress = timeSincePlanted / plant.growthTime;
            
            // Water is now permanent until harvest
            if (cell.waterBonus) {
              if (growthProgress >= 0.33 && newStage < 1) newStage = 1;
              if (growthProgress >= 0.66 && newStage < 2) newStage = 2;
            } else if (growthProgress >= 0.5 && newStage < 1) {
              newStage = 1;
            } else if (growthProgress >= 1 && newStage < 2) {
              newStage = 2;
            }
            
            return {
              ...cell,
              stage: newStage
            };
          })
        );
        return newGrid;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameEnded]);

  const harvestPlant = useCallback((row, col, cell) => {
    const plant = PLANT_TYPES[cell.plant];
    let harvestValue = Math.floor(Math.random() * (plant.valueRange[1] - plant.valueRange[0] + 1)) + plant.valueRange[0];
    
    // Apply water bonus (30% increase) - water is now permanent
    if (cell.waterBonus) {
      harvestValue *= 1.3;
    }
    
    // Apply power-up effects (no chance - always activates)
    if (activePowerUp) {
      const cellKey = `${row}-${col}`;
      
      // Show visual effect on the plant
      setPowerUpEffects(prev => ({ ...prev, [cellKey]: activePowerUp }));
      setTimeout(() => {
        setPowerUpEffects(prev => {
          const newEffects = { ...prev };
          delete newEffects[cellKey];
          return newEffects;
        });
      }, 2000);
      
      if (activePowerUp === 'sunlight') {
        harvestValue *= 2; // 100% boost
      } else if (activePowerUp === 'frozen') {
        harvestValue *= 3; // 200% boost
      }
    }
    
    harvestValue = Math.floor(harvestValue);
    setMoney(prev => prev + harvestValue);
    
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      newGrid[row][col] = {
        plant: null,
        stage: 0,
        plantedAt: null,
        watered: false,
        lastWatered: null,
        waterBonus: false
      };
      return newGrid;
    });
  }, [activePowerUp]);

  const waterPlant = useCallback((row, col) => {
    const cell = grid[row][col];
    if (cell.plant && !cell.waterBonus) {
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        newGrid[row][col] = {
          ...newGrid[row][col],
          watered: true,
          lastWatered: Date.now(),
          waterBonus: true
        };
        return newGrid;
      });
    }
  }, [grid]);

  const plantSeed = useCallback((row, col) => {
    const cell = grid[row][col];
    if (!cell.plant && money >= PLANT_TYPES[selectedPlant].cost && plantStock[selectedPlant] > 0) {
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        newGrid[row][col] = {
          plant: selectedPlant,
          stage: 0,
          plantedAt: Date.now(),
          watered: false,
          lastWatered: null,
          waterBonus: false
        };
        return newGrid;
      });
      setMoney(prev => prev - PLANT_TYPES[selectedPlant].cost);
      setPlantStock(prev => ({ ...prev, [selectedPlant]: prev[selectedPlant] - 1 }));
    }
  }, [grid, money, selectedPlant, plantStock]);

  const handleCellClick = useCallback((row, col) => {
    const cell = grid[row][col];
    
    if (tool === 'plant') {
      plantSeed(row, col);
    } else if (tool === 'water') {
      waterPlant(row, col);
    } else if (tool === 'harvest' && cell.plant && cell.stage === 2) {
      harvestPlant(row, col, cell);
    }
  }, [tool, grid, harvestPlant, plantSeed, waterPlant]);

  const handleMouseDown = useCallback((row, col) => {
    setIsMouseDown(true);
    handleCellClick(row, col);
  }, [handleCellClick]);

  const handleMouseEnter = useCallback((row, col) => {
    if (isMouseDown) {
      if (tool === 'plant') {
        plantSeed(row, col);
      } else if (tool === 'water') {
        waterPlant(row, col);
      }
    }
  }, [isMouseDown, tool, plantSeed, waterPlant]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const harvestAll = useCallback(() => {
    let totalHarvested = 0;
    const plantsToHarvest = [];
    
    // Find all ready plants
    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.plant && cell.stage === 2) {
          plantsToHarvest.push({ row: rowIndex, col: colIndex, cell });
        }
      });
    });
    
    // Harvest all ready plants
    plantsToHarvest.forEach(({ row, col, cell }) => {
      harvestPlant(row, col, cell);
      totalHarvested++;
    });
    
    return totalHarvested;
  }, [grid, harvestPlant]);

  // Add global mouse up listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getCellDisplay = (cell, row, col) => {
    if (!cell.plant) return '🟫';
    
    const plant = PLANT_TYPES[cell.plant];
    const emoji = plant.stages[cell.stage];
    const cellKey = `${row}-${col}`;
    const powerUpEffect = powerUpEffects[cellKey];
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-2xl">{emoji}</span>
        {cell.waterBonus && (
          <div className="absolute top-0 right-0 text-xs animate-pulse">💧</div>
        )}
        {cell.waterBonus && (
          <div className="absolute bottom-0 left-0 text-xs text-blue-600 font-bold">+30%</div>
        )}
        {powerUpEffect && (
          <div className={`absolute inset-0 rounded-lg animate-pulse ${
            powerUpEffect === 'sunlight' 
              ? 'bg-yellow-400 bg-opacity-40 shadow-lg shadow-yellow-300' 
              : 'bg-cyan-400 bg-opacity-40 shadow-lg shadow-cyan-300'
          }`}>
            <div className="absolute top-0 left-0 text-xs font-bold">
              {powerUpEffect === 'sunlight' ? '☀️' : '❄️'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const resetGame = () => {
    setGrid(initializeGrid());
    setMoney(INITIAL_MONEY);
    setGameTime(0);
    setGameEnded(false);
    setShowNameInput(false);
    setSunlightUses(2);
    setFrozenUses(1);
    setActivePowerUp(null);
    setPlantStock(Object.keys(PLANT_TYPES).reduce((acc, plant) => ({ ...acc, [plant]: 15 }), {}));
    setPowerUpEffects({});
    setIsMouseDown(false);
    setLastStockRefresh(0);
  };

  const submitScore = () => {
    if (playerName.trim()) {
      const newScore = { name: playerName.trim(), score: money, date: new Date().toLocaleDateString() };
      const updatedLeaderboard = [...leaderboard, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
      setLeaderboard(updatedLeaderboard);
      setShowNameInput(false);
      setPlayerName('');
    }
  };

  const activateSunlight = () => {
    if (sunlightUses > 0 && !activePowerUp) {
      setSunlightUses(prev => prev - 1);
      setActivePowerUp('sunlight');
      setTimeout(() => setActivePowerUp(null), 8000); // 8 seconds duration
    }
  };

  const activateFrozen = () => {
    if (frozenUses > 0 && !activePowerUp) {
      setFrozenUses(prev => prev - 1);
      setActivePowerUp('frozen');
      setTimeout(() => setActivePowerUp(null), 8000); // 8 seconds duration
    }
  };

  const getPowerUpDisplay = () => {
    if (activePowerUp === 'sunlight') return 'Sunlight Active! (+100% value)';
    if (activePowerUp === 'frozen') return 'Frozen Active! (+200% value)';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-600 p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-2 h-2 bg-white opacity-20 rounded-full animate-pulse" style={{top: '10%', left: '20%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-white opacity-30 rounded-full animate-pulse" style={{top: '30%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-white opacity-15 rounded-full animate-pulse" style={{top: '60%', left: '15%', animationDelay: '2s'}}></div>
        <div className="absolute w-1 h-1 bg-white opacity-25 rounded-full animate-pulse" style={{top: '80%', left: '70%', animationDelay: '3s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Main Game Area */}
        <div className="flex-1">
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-2xl p-6 mb-4 backdrop-blur-sm border border-white/20 relative z-10">
            <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 bg-clip-text text-transparent mb-6 animate-pulse">
              🌱 Garden Growing Game 🌱
            </h1>
            
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-200 to-yellow-300 px-6 py-3 rounded-xl shadow-lg border border-yellow-400/30 transform hover:scale-105 transition-transform">
                <Coins className="w-6 h-6 text-yellow-700 animate-bounce" />
                <span className="font-bold text-lg text-yellow-800">${money.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-200 to-blue-300 px-6 py-3 rounded-xl shadow-lg border border-blue-400/30 transform hover:scale-105 transition-transform">
                <span className="font-bold text-lg text-blue-800">⏰ {Math.floor((180000 - gameTime) / 1000)}s left</span>
              </div>
            </div>

            {activePowerUp && (
              <div className="text-center mb-4 animate-pulse">
                <div className={`inline-block px-6 py-3 rounded-xl font-bold shadow-lg border transform scale-110 animate-bounce ${
                  activePowerUp === 'sunlight' 
                    ? 'bg-gradient-to-r from-yellow-200 to-orange-200 text-orange-800 border-orange-300' 
                    : 'bg-gradient-to-r from-blue-200 to-cyan-200 text-cyan-800 border-cyan-300'
                }`}>
                  ✨ {getPowerUpDisplay()} ✨
                </div>
              </div>
            )}

            {gameEnded && !showNameInput && (
              <div className="text-center mb-6 transform animate-bounce">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">🎉 Game Over! 🎉</h2>
                <p className="text-xl mb-4 font-semibold text-gray-700">Final Score: <span className="text-green-600">${money.toLocaleString()}</span></p>
                <button
                  onClick={() => setShowNameInput(true)}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg mr-4 font-semibold"
                >
                  🏆 Add to Leaderboard
                </button>
                <button
                  onClick={resetGame}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
                >
                  🔄 Play Again
                </button>
              </div>
            )}

            {showNameInput && (
              <div className="text-center mb-6 transform animate-pulse">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">✨ Enter Your Name ✨</h3>
                <div className="flex justify-center gap-3">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="px-4 py-3 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none bg-gradient-to-r from-white to-purple-50 shadow-lg font-semibold"
                    maxLength={20}
                  />
                  <button
                    onClick={submitScore}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg font-semibold"
                  >
                    🚀 Submit
                  </button>
                </div>
              </div>
            )}

            {!gameEnded && (
              <div className="flex justify-center gap-4 mb-6">
                <button
                  onClick={() => setTool('plant')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    tool === 'plant' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-300' 
                      : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700'
                  }`}
                >
                  <Sprout className="w-5 h-5" />
                  Plant
                </button>
                <button
                  onClick={() => setTool('water')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    tool === 'water' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-300' 
                      : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700'
                  }`}
                >
                  <Droplets className="w-5 h-5" />
                  Water (+30%)
                </button>
                <button
                  onClick={() => setTool('harvest')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    tool === 'harvest' 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-300' 
                      : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700'
                  }`}
                >
                  <Shovel className="w-5 h-5" />
                  Harvest
                </button>
                <button
                  onClick={harvestAll}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                >
                  <Shovel className="w-5 h-5" />
                  Harvest All
                </button>
              </div>
            )}

            {tool === 'plant' && !gameEnded && (
              <div className="grid grid-cols-3 gap-3 justify-center mb-6 max-w-3xl mx-auto">
                {Object.entries(PLANT_TYPES).map(([key, plant]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlant(key)}
                    disabled={money < plant.cost || plantStock[key] === 0}
                    className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 shadow-lg relative ${
                      selectedPlant === key 
                        ? 'border-green-500 bg-gradient-to-br from-green-100 to-green-200 shadow-green-300' 
                        : 'border-gray-300 hover:border-gray-400 bg-gradient-to-br from-white to-gray-50'
                    } ${money < plant.cost || plantStock[key] === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}`}
                  >
                    <div className={`text-sm font-bold ${money >= plant.cost && plantStock[key] > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                      {plant.name}
                    </div>
                    <div className="text-xs text-gray-600">${plant.cost.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">${plant.valueRange[0].toLocaleString()}-${plant.valueRange[1].toLocaleString()}</div>
                    <div className={`text-xs font-bold ${plantStock[key] > 5 ? 'text-green-600' : plantStock[key] > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      Stock: {plantStock[key]}
                    </div>
                    {plantStock[key] === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-80 rounded-xl">
                        <span className="text-white font-bold text-xs">OUT OF STOCK</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-8 gap-2 bg-gradient-to-br from-amber-200 to-yellow-200 p-6 rounded-2xl shadow-xl max-w-lg mx-auto border border-amber-300">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                    className={`w-14 h-14 border-2 rounded-lg transition-all duration-300 transform hover:scale-105 select-none ${
                      cell.plant && cell.stage === 2 
                        ? 'border-green-500 bg-green-100 shadow-lg shadow-green-300 animate-pulse' 
                        : 'border-amber-300 hover:border-amber-400 bg-gradient-to-br from-amber-100 to-yellow-100 hover:shadow-md'
                    }`}
                  >
                    {getCellDisplay(cell, rowIndex, colIndex)}
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
              <p className="mb-2 font-bold text-lg text-blue-800">
                🎯 How to play: You have 3 minutes to make as much money as possible!
              </p>
              <p className="mb-2 font-semibold">
                🌱 Plant seeds (drag to plant multiple) • 💧 Water plants for +30% profit (drag to water multiple) • 🥕 Harvest mature plants
              </p>
              <p className="text-xs mb-2 font-medium text-purple-700">
                📦 Each plant has 15 stock, replenished every 30 seconds • Cherry Blossom costs 30K but gives massive returns!
              </p>
              <p className="text-xs text-green-700 font-semibold">
                💡 Tip: Hold and drag to plant/water quickly! Water is permanent until harvest!
              </p>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
              >
                {gameEnded ? '🆕 New Game' : '🔄 Reset Game'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar with Power-ups and Leaderboard */}
        <div className="w-80 space-y-4">
          {/* Power-ups */}
          {!gameEnded && (
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 shadow-xl border border-purple-200">
              <h3 className="text-lg font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ⚡ Power-ups
              </h3>
              <div className="space-y-3">
                <button
                  onClick={activateSunlight}
                  disabled={sunlightUses === 0 || activePowerUp}
                  className={`w-full px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg ${
                    sunlightUses > 0 && !activePowerUp
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:from-yellow-500 hover:to-orange-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ☀️ Sunlight ({sunlightUses} uses)
                  <div className="text-xs">+100% value</div>
                </button>
                <button
                  onClick={activateFrozen}
                  disabled={frozenUses === 0 || activePowerUp}
                  className={`w-full px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg ${
                    frozenUses > 0 && !activePowerUp
                      ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white hover:from-blue-500 hover:to-cyan-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ❄️ Frozen ({frozenUses} uses)
                  <div className="text-xs">+200% value</div>
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-4 shadow-xl border border-yellow-300">
              <h3 className="text-lg font-bold text-center mb-3 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                🏆 Leaderboard
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-yellow-700">#{index + 1}</span>
                      <span className="font-medium text-gray-800 text-sm truncate">{entry.name}</span>
                    </div>
                    <span className="font-bold text-green-600">${entry.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GardenGame;
