// Convert degrees to radians
function toRad(deg) {
  return deg * Math.PI / 180;
}

// Haversine formula
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetch lat/lon from Nominatim
async function getCoordinates(place) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'DistanceCalculator/1.0 (your-email@example.com)' }
  });
  const data = await resp.json();
  if (data.length === 0) throw new Error(`Location not found: "${place}"`);
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    name: data[0].display_name
  };
}

const transportRates = {
  "TOURIST VAN": 15,
  "CAR": 10,
  "MAHENDIRA PICKUP": 12,
  "TATA ACE": 10,
  "AUTO": 8
};

document.getElementById("travelForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();
  const date = document.getElementById("date").value;
  const transport = document.getElementById("transport").value.trim();
  const message = document.getElementById("message");
  const paymentOptions = document.getElementById("paymentOptions");

  if (!name || !from || !to || !date || !transport) {
    message.textContent = "❗ Please fill in all fields.";
    message.style.color = "red";
    return;
  }

  try {
    message.style.color = "black";
    message.textContent = "🚀 Calculating...";

    const [fromCoord, toCoord] = await Promise.all([
      getCoordinates(from),
      getCoordinates(to)
    ]);

    const distance = haversine(fromCoord.lat, fromCoord.lon, toCoord.lat, toCoord.lon);
    const pricePerKm = transportRates[transport];
    const totalPrice = distance * pricePerKm;
    const roundedPrice = totalPrice.toFixed(2);

    message.innerHTML = `
      Distance from <strong>${fromCoord.name}</strong> to <strong>${toCoord.name}</strong> is
      <strong>${distance.toFixed(2)} km</strong>.<br>
      Total Price for <strong>${transport}</strong>: ₹<strong>${roundedPrice}</strong>
    `;

    paymentOptions.dataset.amount = roundedPrice;
    paymentOptions.style.display = "block";

    // Save to localStorage
    localStorage.setItem("travelAmount", roundedPrice);
    localStorage.setItem("from", fromCoord.name);
    localStorage.setItem("to", toCoord.name);
    localStorage.setItem("transport", transport);

    // POST booking data to backend
    const bookingData = {
      name,
      from,
      to,
      date,
      transport,
      distance: distance.toFixed(2),
      price: roundedPrice
    };

    const response = await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) throw new Error("Booking submission failed!");
    console.log("✅ Booking saved successfully");

  } catch (err) {
    message.style.color = "red";
    message.textContent = "❗ " + err.message;
  }
});

// Manual distance price calculator
function calculate() {
  const vehicle = document.getElementById("vehicle").value;
  const distance = parseFloat(document.getElementById("distance").value);
  const result = document.getElementById("result");

  if (!vehicle || isNaN(distance) || distance <= 0) {
    result.textContent = "Please select a vehicle and enter a valid distance.";
    return;
  }

  const ratePerKm = transportRates[vehicle];
  const total = distance * ratePerKm;

  result.textContent = `Estimated Price for ${vehicle.toUpperCase()}: ₹${total.toLocaleString()}`;
}
