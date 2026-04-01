const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BusLink database...\n');

  // ─── Clean existing data ────────────────────────────────
  await prisma.schedule.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.recentEntry.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ──────────────────────────────────────────────
  const hashedPw = await bcrypt.hash('password123', 12);

  const passenger = await prisma.user.create({
    data: {
      name: 'Rudra Passenger',
      email: 'passenger@buslink.app',
      hashedPassword: hashedPw,
      role: 'passenger',
      accountStatus: 'active',
    },
  });
  console.log('👤 Created passenger:', passenger.email);

  const driver = await prisma.user.create({
    data: {
      name: 'Amit Driver',
      email: 'driver@buslink.app',
      hashedPassword: hashedPw,
      role: 'driver',
      accountStatus: 'active',
    },
  });
  console.log('🚐 Created driver:', driver.email);

  // ─── Stops (Raipur) ────────────────────────────────────
  const stops = await Promise.all([
    prisma.stop.create({
      data: { name: 'Amanaka', city: 'Raipur', lat: 21.2365, lng: 81.6337, amenities: ['bench', 'shelter'] },
    }),
    prisma.stop.create({
      data: { name: 'Telibandha', city: 'Raipur', lat: 21.2412, lng: 81.6519, amenities: ['bench'] },
    }),
    prisma.stop.create({
      data: { name: 'Shankar Nagar', city: 'Raipur', lat: 21.2480, lng: 81.6202, amenities: ['shelter'] },
    }),
    prisma.stop.create({
      data: { name: 'Pandri', city: 'Raipur', lat: 21.2340, lng: 81.6454, amenities: ['bench', 'shelter'] },
    }),
    prisma.stop.create({
      data: { name: 'Railway Station', city: 'Raipur', lat: 21.2179, lng: 81.6302, amenities: ['bench', 'shelter', 'toilet'] },
    }),
    prisma.stop.create({
      data: { name: 'Magneto Mall', city: 'Raipur', lat: 21.2406, lng: 81.6114, amenities: ['bench'] },
    }),
    prisma.stop.create({
      data: { name: 'Tatibandh', city: 'Raipur', lat: 21.2791, lng: 81.6002, amenities: ['shelter'] },
    }),
    prisma.stop.create({
      data: { name: 'Bhatagaon', city: 'Raipur', lat: 21.2651, lng: 81.5862, amenities: [] },
    }),
  ]);
  console.log(`📍 Created ${stops.length} stops`);

  // ─── Route 1: Amanaka → Tatibandh ─────────────────────
  const route1 = await prisma.route.create({
    data: {
      name: 'Route 1 — Amanaka to Tatibandh',
      city: 'Raipur',
      active: true,
      distanceKm: 8.5,
    },
  });

  const route1Stops = [stops[0], stops[3], stops[4], stops[2], stops[5], stops[6]];
  for (let i = 0; i < route1Stops.length; i++) {
    await prisma.routeStop.create({
      data: {
        routeId: route1.id,
        stopId: route1Stops[i].id,
        sequence: i + 1,
        distanceFromOrigin: parseFloat((i * 1.7).toFixed(1)),
      },
    });
  }
  console.log('🛤️  Created Route 1:', route1.name);

  // ─── Route 2: Railway Station → Bhatagaon ────────────
  const route2 = await prisma.route.create({
    data: {
      name: 'Route 2 — Railway Station to Bhatagaon',
      city: 'Raipur',
      active: true,
      distanceKm: 7.2,
    },
  });

  const route2Stops = [stops[4], stops[3], stops[1], stops[5], stops[7]];
  for (let i = 0; i < route2Stops.length; i++) {
    await prisma.routeStop.create({
      data: {
        routeId: route2.id,
        stopId: route2Stops[i].id,
        sequence: i + 1,
        distanceFromOrigin: parseFloat((i * 1.8).toFixed(1)),
      },
    });
  }
  console.log('🛤️  Created Route 2:', route2.name);

  // ─── Bus ──────────────────────────────────────────────
  const bus = await prisma.bus.create({
    data: {
      plateNumber: 'CG04LF8526',
      routeId: route1.id,
      driverId: driver.id,
      status: 'idle',
      capacity: 40,
      currentLat: 21.2365,
      currentLng: 81.6337,
    },
  });
  console.log('🚌 Created bus:', bus.plateNumber);

  const bus2 = await prisma.bus.create({
    data: {
      plateNumber: 'CG04MH1234',
      routeId: route2.id,
      status: 'idle',
      capacity: 35,
      currentLat: 21.2179,
      currentLng: 81.6302,
    },
  });
  console.log('🚌 Created bus:', bus2.plateNumber);

  // ─── Trips for bus 1 ─────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trip1 = await prisma.trip.create({
    data: {
      tripNumber: 1,
      busId: bus.id,
      originStop: 'Amanaka',
      destStop: 'Tatibandh',
      distanceKm: 8.5,
      departureTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), // 6 AM
      status: 'scheduled',
      date: today,
    },
  });

  const trip2 = await prisma.trip.create({
    data: {
      tripNumber: 2,
      busId: bus.id,
      originStop: 'Tatibandh',
      destStop: 'Amanaka',
      distanceKm: 8.5,
      departureTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
      status: 'scheduled',
      date: today,
    },
  });

  const trip3 = await prisma.trip.create({
    data: {
      tripNumber: 3,
      busId: bus.id,
      originStop: 'Amanaka',
      destStop: 'Tatibandh',
      distanceKm: 8.5,
      departureTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
      status: 'scheduled',
      date: today,
    },
  });
  console.log('📋 Created 3 trips for bus', bus.plateNumber);

  // ─── Schedule entries for bus 1 ───────────────────────
  for (let i = 0; i < route1Stops.length; i++) {
    await prisma.schedule.create({
      data: {
        busId: bus.id,
        stopId: route1Stops[i].id,
        scheduledArrival: new Date(
          today.getTime() + 6 * 60 * 60 * 1000 + i * 20 * 60 * 1000
        ), // every 20 min
        estimatedArrival: new Date(
          today.getTime() +
            6 * 60 * 60 * 1000 +
            i * 20 * 60 * 1000 +
            (i === 3 ? 5 * 60 * 1000 : 0) // 5 min delay at stop 3
        ),
        delayMinutes: i === 3 ? 5 : 0,
        passengerCount: Math.floor(Math.random() * 25) + 5,
        isCurrent: i === 2, // bus is at stop index 2
        date: today,
      },
    });
  }
  console.log('⏰ Created schedule entries for bus', bus.plateNumber);

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
