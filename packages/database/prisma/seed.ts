// BuildOS - Database Seed
// Creates: 1 tenant, 1 owner, base roles & permissions

import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Construction Company",
      slug: "demo-company",
      isActive: true,
    },
  });

  console.log("✅ Created tenant:", tenant.name);

  // Create Base Permissions (global, no tenantId)
  const permissions = [
    // Projects
    { resource: "projects", action: "view", description: "View projects" },
    { resource: "projects", action: "create", description: "Create projects" },
    { resource: "projects", action: "update", description: "Update projects" },
    { resource: "projects", action: "delete", description: "Delete projects" },

    // Estimates
    { resource: "estimates", action: "view", description: "View estimates (client prices only)" },
    { resource: "estimates", action: "view_cost", description: "View cost breakdown (internal)" },
    { resource: "estimates", action: "create", description: "Create estimates" },
    { resource: "estimates", action: "update", description: "Update estimates" },
    { resource: "estimates", action: "delete", description: "Delete estimates" },
    { resource: "estimates", action: "approve", description: "Approve estimates" },

    // Rooms
    { resource: "rooms", action: "view", description: "View rooms" },
    { resource: "rooms", action: "create", description: "Create rooms" },
    { resource: "rooms", action: "update", description: "Update rooms" },
    { resource: "rooms", action: "delete", description: "Delete rooms" },

    // Stages
    { resource: "stages", action: "view", description: "View stages" },
    { resource: "stages", action: "create", description: "Create stages" },
    { resource: "stages", action: "update", description: "Update stages" },
    { resource: "stages", action: "delete", description: "Delete stages" },

    // Users (admin)
    { resource: "users", action: "view", description: "View users" },
    { resource: "users", action: "create", description: "Create users" },
    { resource: "users", action: "update", description: "Update users" },
    { resource: "users", action: "delete", description: "Delete users" },

    // Catalogs
    { resource: "catalogs", action: "view", description: "View material/work catalogs" },
    { resource: "catalogs", action: "manage", description: "Manage catalogs" },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: {
          tenantId_resource_action: {
            tenantId: tenant.id,
            resource: p.resource,
            action: p.action,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          resource: p.resource,
          action: p.action,
          description: p.description,
          isGlobal: true, // Mark as global (for documentation)
        },
      })
    )
  );

  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // Create Roles for this tenant
  const ownerRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "owner",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "owner",
      description: "Company owner - full access including cost visibility",
      isSystem: true,
    },
  });

  const pmRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "project_manager",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "project_manager",
      description: "Project manager - can view costs but not manage users",
      isSystem: true,
    },
  });

  const clientRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "client",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "client",
      description: "Client - can only view their projects and estimates (NO cost visibility)",
      isSystem: true,
    },
  });

  console.log("✅ Created roles: owner, project_manager, client");

  // Assign ALL permissions to Owner role
  const allPermissionIds = createdPermissions.map((p) => p.id);
  await Promise.all(
    allPermissionIds.map((permId) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ownerRole.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: ownerRole.id,
          permissionId: permId,
        },
      })
    )
  );

  console.log("✅ Assigned all permissions to owner role");

  // Assign PM permissions (view_cost but not user management)
  const pmPermissions = createdPermissions.filter(
    (p) =>
      p.resource !== "users" && // PM can't manage users
      (p.resource === "estimates" ? p.action !== "delete" : true) // PM can't delete estimates
  );

  await Promise.all(
    pmPermissions.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: pmRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: pmRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  console.log("✅ Assigned PM permissions (view_cost: YES, user mgmt: NO)");

  // Assign Client permissions (NO view_cost!)
  const clientPermissions = createdPermissions.filter(
    (p) =>
      p.resource === "projects" && p.action === "view" || // Can only VIEW projects
      p.resource === "estimates" && p.action === "view" || // Can only VIEW estimates (NOT view_cost)
      p.resource === "rooms" && p.action === "view" || // Can only VIEW rooms
      p.resource === "stages" && p.action === "view" // Can only VIEW stages
  );

  await Promise.all(
    clientPermissions.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: clientRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: clientRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  console.log("✅ Assigned client permissions (view_cost: NO)");

  // Create Owner user
  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "owner@demo-company.com",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "owner@demo-company.com",
      name: "Demo Owner",
      passwordHash: "$2a$10$placeholder", // In production, use proper bcrypt hash
      isActive: true,
    },
  });

  console.log("✅ Created owner user:", owner.email);

  // Assign owner role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: owner.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      roleId: ownerRole.id,
    },
  });

  console.log("✅ Assigned owner role to user");

  console.log("\n🎉 Seed completed successfully!");
  console.log("📊 Summary:");
  console.log(`   - Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   - Permissions: ${createdPermissions.length}`);
  console.log(`   - Roles: 3 (owner, project_manager, client)`);
  console.log(`   - Users: 1 (${owner.email})`);
  console.log("\n🔐 RBAC Setup:");
  console.log("   - Owner: Full access + view_cost");
  console.log("   - PM: Most access + view_cost (no user mgmt)");
  console.log("   - Client: View only, NO view_cost");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
