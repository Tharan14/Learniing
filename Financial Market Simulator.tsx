import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, Minus, RefreshCw, Award, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const MarketMaven = () => {
  const [portfolio, setPortfolio] = useState({
    cash: 100000,
    stocks: {},
    history: [{ time: Date.now(), value: 100000 }]
  });
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeAmount, setTradeAmount] = useState(1);
  const [marketData, setMarketData] = useState({});
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Popular stocks to track
  const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];

  // Generate realistic market data with mathematical models
  const generateMarketData = () => {
    const baseData = {
      'AAPL': { name: 'Apple Inc.', basePrice: 178.50, volatility: 0.02 },
      'GOOGL': { name: 'Alphabet Inc.', basePrice: 141.80, volatility: 0.025 },
      'MSFT': { name: 'Microsoft Corp.', basePrice: 378.91, volatility: 0.018 },
      'AMZN': { name: 'Amazon.com Inc.', basePrice: 178.25, volatility: 0.03 },
      'TSLA': { name: 'Tesla Inc.', basePrice: 242.84, volatility: 0.04 },
      'NVDA': { name: 'NVIDIA Corp.', basePrice: 505.48, volatility: 0.035 },
      'META': { name: 'Meta Platforms', basePrice: 531.25, volatility: 0.028 },
      'NFLX': { name: 'Netflix Inc.', basePrice: 702.50, volatility: 0.032 }
    };

    const newData = {};
    const time = Date.now();

    Object.keys(baseData).forEach(symbol => {
      const stock = baseData[symbol];
      const existingData = marketData[symbol];
      
      // Use geometric Brownian motion for realistic price movement
      const dt = 1/252; // One trading day
      const drift = 0.0001;
      const randomShock = (Math.random() - 0.5) * 2;
      
      let currentPrice = existingData?.price || stock.basePrice;
      const priceChange = currentPrice * (drift * dt + stock.volatility * Math.sqrt(dt) * randomShock);
      const newPrice = Math.max(currentPrice + priceChange, stock.basePrice * 0.5);
      
      const change = ((newPrice - currentPrice) / currentPrice) * 100;
      
      // Generate historical data
      const history = existingData?.history || [];
      history.push({ time, price: newPrice });
      if (history.length > 50) history.shift();

      // Calculate technical indicators
      const prices = history.map(h => h.price);
      const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);
      const volume = Math.floor(Math.random() * 50000000 + 10000000);
      
      newData[symbol] = {
        ...stock,
        price: newPrice,
        change: change,
        changeAmount: newPrice - currentPrice,
        history: history,
        sma20: sma20,
        volume: volume,
        high: Math.max(...prices.slice(-20)),
        low: Math.min(...prices.slice(-20))
      };
    });

    return newData;
  };

  // Generate market news
  const generateNews = () => {
    const templates = [
      { text: "Tech sector shows strong momentum in morning trading", sentiment: 1 },
      { text: "Federal Reserve signals potential rate adjustments", sentiment: 0 },
      { text: "Market volatility increases amid economic uncertainty", sentiment: -1 },
      { text: "AI stocks surge on breakthrough announcements", sentiment: 1 },
      { text: "Energy prices impact consumer spending forecasts", sentiment: -1 },
      { text: "Quarterly earnings exceed analyst expectations", sentiment: 1 }
    ];
    
    return templates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((item, i) => ({
        id: Date.now() + i,
        ...item,
        time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString()
      }));
  };

  // Initialize data
  useEffect(() => {
    const initData = generateMarketData();
    setMarketData(initData);
    setNewsItems(generateNews());
    setSelectedStock(stockSymbols[0]);
    setLoading(false);

    // Update market data every 3 seconds
    const interval = setInterval(() => {
      const newData = generateMarketData();
      setMarketData(newData);
      setLastUpdate(Date.now());
      
      // Occasionally generate new news
      if (Math.random() < 0.1) {
        setNewsItems(generateNews());
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update portfolio value
  useEffect(() => {
    if (Object.keys(marketData).length > 0) {
      const stockValue = Object.keys(portfolio.stocks).reduce((sum, symbol) => {
        const shares = portfolio.stocks[symbol];
        const price = marketData[symbol]?.price || 0;
        return sum + (shares * price);
      }, 0);
      
      const totalValue = portfolio.cash + stockValue;
      
      setPortfolio(prev => {
        const newHistory = [...prev.history];
        newHistory.push({ time: Date.now(), value: totalValue });
        if (newHistory.length > 100) newHistory.shift();
        
        return { ...prev, history: newHistory };
      });
    }
  }, [marketData]);

  const buyStock = () => {
    if (!selectedStock || !marketData[selectedStock]) return;
    
    const stock = marketData[selectedStock];
    const cost = stock.price * tradeAmount;
    
    if (cost > portfolio.cash) {
      alert('Insufficient funds!');
      return;
    }
    
    setPortfolio(prev => ({
      ...prev,
      cash: prev.cash - cost,
      stocks: {
        ...prev.stocks,
        [selectedStock]: (prev.stocks[selectedStock] || 0) + tradeAmount
      }
    }));
  };

  const sellStock = () => {
    if (!selectedStock || !marketData[selectedStock]) return;
    
    const currentShares = portfolio.stocks[selectedStock] || 0;
    if (currentShares < tradeAmount) {
      alert('Insufficient shares!');
      return;
    }
    
    const stock = marketData[selectedStock];
    const revenue = stock.price * tradeAmount;
    
    setPortfolio(prev => ({
      ...prev,
      cash: prev.cash + revenue,
      stocks: {
        ...prev.stocks,
        [selectedStock]: currentShares - tradeAmount
      }
    }));
  };

  const totalValue = portfolio.cash + Object.keys(portfolio.stocks).reduce((sum, symbol) => {
    const shares = portfolio.stocks[symbol];
    const price = marketData[symbol]?.price || 0;
    return sum + (shares * price);
  }, 0);

  const totalReturn = ((totalValue - 100000) / 100000) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading Market Data...</div>
      </div>
    );
  }

  const selectedStockData = selectedStock ? marketData[selectedStock] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="text-blue-400" />
              Market Maven
            </h1>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Activity size={16} className="animate-pulse text-green-400" />
              Live Market Data
            </div>
          </div>
          <p className="text-slate-300">Real-Time Trading Simulator with Mathematical Market Models</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Portfolio Value</span>
              <DollarSign size={18} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Cash Available</span>
              <DollarSign size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Return</span>
              {totalReturn >= 0 ? 
                <TrendingUp size={18} className="text-green-400" /> : 
                <TrendingDown size={18} className="text-red-400" />
              }
            </div>
            <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Holdings</span>
              <Award size={18} className="text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {Object.keys(portfolio.stocks).filter(s => portfolio.stocks[s] > 0).length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Market Stocks</h2>
              <div className="space-y-2">
                {stockSymbols.map(symbol => {
                  const stock = marketData[symbol];
                  if (!stock) return null;
                  
                  const isSelected = selectedStock === symbol;
                  const owned = portfolio.stocks[symbol] || 0;
                  
                  return (
                    <button
                      key={symbol}
                      onClick={() => setSelectedStock(symbol)}
                      className={`w-full p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-blue-900 border-2 border-blue-500' 
                          : 'bg-slate-800 border border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <div className="font-bold text-white">{symbol}</div>
                          <div className="text-xs text-slate-400">{stock.name}</div>
                        </div>
                        {stock.change >= 0 ? (
                          <TrendingUp size={20} className="text-green-400" />
                        ) : (
                          <TrendingDown size={20} className="text-red-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-white">
                          ${stock.price.toFixed(2)}
                        </div>
                        <div className={`text-sm font-semibold ${
                          stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </div>
                      </div>
                      {owned > 0 && (
                        <div className="mt-2 text-xs text-blue-400">
                          Owned: {owned} shares (${(owned * stock.price).toFixed(2)})
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Market News */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Market News</h2>
              <div className="space-y-3">
                {newsItems.map(news => (
                  <div key={news.id} className="p-3 bg-slate-800 rounded border border-slate-700">
                    <div className="text-sm text-slate-300">{news.text}</div>
                    <div className="text-xs text-slate-500 mt-1">{news.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chart and Trading */}
          <div className="lg:col-span-2 space-y-4">
            {selectedStockData && (
              <>
                {/* Stock Chart */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white">{selectedStock}</h2>
                    <p className="text-slate-400">{selectedStockData.name}</p>
                    <div className="flex items-baseline gap-4 mt-2">
                      <span className="text-3xl font-bold text-white">
                        ${selectedStockData.price.toFixed(2)}
                      </span>
                      <span className={`text-lg font-semibold ${
                        selectedStockData.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedStockData.change >= 0 ? '+' : ''}
                        ${selectedStockData.changeAmount.toFixed(2)} ({selectedStockData.change.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={selectedStockData.history}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8"
                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        labelStyle={{ color: '#cbd5e1' }}
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                        labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-800 p-3 rounded">
                      <div className="text-xs text-slate-400">Volume</div>
                      <div className="text-sm font-semibold text-white">
                        {(selectedStockData.volume / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <div className="text-xs text-slate-400">Day High</div>
                      <div className="text-sm font-semibold text-green-400">
                        ${selectedStockData.high.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <div className="text-xs text-slate-400">Day Low</div>
                      <div className="text-sm font-semibold text-red-400">
                        ${selectedStockData.low.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Panel */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Trade {selectedStock}</h3>
                  
                  <div className="mb-4">
                    <label className="text-slate-400 text-sm mb-2 block">Number of Shares</label>
                    <input
                      type="number"
                      min="1"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                    />
                    <div className="text-xs text-slate-400 mt-1">
                      Total: ${(selectedStockData.price * tradeAmount).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={buyStock}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus size={20} />
                      Buy
                    </button>
                    <button
                      onClick={sellStock}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Minus size={20} />
                      Sell
                    </button>
                  </div>

                  <div className="mt-4 p-4 bg-slate-800 rounded">
                    <div className="text-sm text-slate-400">Current Position</div>
                    <div className="text-lg font-semibold text-white">
                      {portfolio.stocks[selectedStock] || 0} shares
                    </div>
                    {portfolio.stocks[selectedStock] > 0 && (
                      <div className="text-sm text-blue-400">
                        Value: ${((portfolio.stocks[selectedStock] || 0) * selectedStockData.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Portfolio Performance */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Portfolio Performance</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={portfolio.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8"
                        tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        labelStyle={{ color: '#cbd5e1' }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                        labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketMaven;