// BuildOS - Database Seed
// Creates: 1 tenant, 1 owner, base roles & permissions
// + ANCHOR demo company with 7 projects, estimates, stages

import { PrismaClient } from "../src/generated/client";
import { seedAnchorProjects } from "./seed-anchor-projects";

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

    // Photos
    { resource: "photos", action: "view", description: "View project photos" },
    { resource: "photos", action: "create", description: "Upload project photos" },
    { resource: "photos", action: "delete", description: "Delete project photos" },

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
      p.resource === "stages" && p.action === "view" || // Can only VIEW stages
      p.resource === "photos" && p.action === "view" // Can only VIEW photos
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

  console.log("\n🎉 Base seed completed!");
  console.log("📊 Summary:");
  console.log(`   - Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   - Permissions: ${createdPermissions.length}`);
  console.log(`   - Roles: 3 (owner, project_manager, client)`);
  console.log(`   - Users: 1 (${owner.email})`);

  // ============================================================================
  // ANCHOR CONSTRUCTION - DEMO COMPANY (70 employees)
  // ============================================================================

  console.log("\n\n🏢 Creating ANCHOR Construction demo company...");

  const anchorTenant = await prisma.tenant.upsert({
    where: { slug: "anchor-construction" },
    update: {},
    create: {
      name: "ANCHOR Construction sp. z o.o.",
      slug: "anchor-construction",
      isActive: true,
    },
  });

  console.log("✅ Created ANCHOR tenant");

  // Create ANCHOR permissions (reuse global permissions)
  const anchorPermissions = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: {
          tenantId_resource_action: {
            tenantId: anchorTenant.id,
            resource: p.resource,
            action: p.action,
          },
        },
        update: {},
        create: {
          tenantId: anchorTenant.id,
          resource: p.resource,
          action: p.action,
          description: p.description,
          isGlobal: false,
        },
      })
    )
  );

  // Create ANCHOR roles
  const anchorOwnerRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: anchorTenant.id,
        name: "owner",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      name: "owner",
      description: "Company owner - full access",
      isSystem: true,
    },
  });

  const anchorPmRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: anchorTenant.id,
        name: "project_manager",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      name: "project_manager",
      description: "Project manager",
      isSystem: true,
    },
  });

  const anchorClientRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: anchorTenant.id,
        name: "client",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      name: "client",
      description: "Client - view only",
      isSystem: true,
    },
  });

  // Assign permissions to ANCHOR roles
  await Promise.all(
    anchorPermissions.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: anchorOwnerRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: anchorOwnerRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  const anchorPmPerms = anchorPermissions.filter(
    (p) =>
      p.resource !== "users" &&
      (p.resource === "estimates" ? p.action !== "delete" : true)
  );

  await Promise.all(
    anchorPmPerms.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: anchorPmRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: anchorPmRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  const anchorClientPerms = anchorPermissions.filter(
    (p) =>
      (p.resource === "projects" && p.action === "view") ||
      (p.resource === "estimates" && p.action === "view") ||
      (p.resource === "rooms" && p.action === "view") ||
      (p.resource === "stages" && p.action === "view") ||
      (p.resource === "photos" && p.action === "view")
  );

  await Promise.all(
    anchorClientPerms.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: anchorClientRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: anchorClientRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  // Create ANCHOR Owner
  const anchorOwner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: anchorTenant.id,
        email: "zbigniew@anchor-construction.pl",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      email: "zbigniew@anchor-construction.pl",
      name: "Zbigniew Kowalski",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: anchorOwner.id,
        roleId: anchorOwnerRole.id,
      },
    },
    update: {},
    create: {
      userId: anchorOwner.id,
      roleId: anchorOwnerRole.id,
    },
  });

  // Create Project Managers
  const pm1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: anchorTenant.id,
        email: "anna@anchor-construction.pl",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      email: "anna@anchor-construction.pl",
      name: "Anna Nowak",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: pm1.id,
        roleId: anchorPmRole.id,
      },
    },
    update: {},
    create: {
      userId: pm1.id,
      roleId: anchorPmRole.id,
    },
  });

  const pm2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: anchorTenant.id,
        email: "piotr@anchor-construction.pl",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      email: "piotr@anchor-construction.pl",
      name: "Piotr Michalik",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: pm2.id,
        roleId: anchorPmRole.id,
      },
    },
    update: {},
    create: {
      userId: pm2.id,
      roleId: anchorPmRole.id,
    },
  });

  // Create Client users (investors)
  const client1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: anchorTenant.id,
        email: "jan@investment-group.pl",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      email: "jan@investment-group.pl",
      name: "Jan Investment Group",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: client1.id,
        roleId: anchorClientRole.id,
      },
    },
    update: {},
    create: {
      userId: client1.id,
      roleId: anchorClientRole.id,
    },
  });

  const client2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: anchorTenant.id,
        email: "contact@propdev-fund.pl",
      },
    },
    update: {},
    create: {
      tenantId: anchorTenant.id,
      email: "contact@propdev-fund.pl",
      name: "Property Development Fund",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: client2.id,
        roleId: anchorClientRole.id,
      },
    },
    update: {},
    create: {
      userId: client2.id,
      roleId: anchorClientRole.id,
    },
  });

  console.log("✅ Created ANCHOR users: 1 owner, 2 PMs, 2 clients");

  console.log("\n🔐 RBAC Setup (ANCHOR):");
  console.log("   - Owner: Full access + view_cost");
  console.log("   - PM: Most access + view_cost (no user mgmt)");
  console.log("   - Client: View only, NO view_cost");

  // Create 7 demo projects with estimates and stages
  await seedAnchorProjects(prisma, anchorTenant.id);

  // Final summary
  console.log("\n\n🎉 ANCHOR Demo Setup Complete!");
  console.log("📊 ANCHOR Summary:");
  console.log("   - Tenant: ANCHOR Construction sp. z o.o.");
  console.log("   - Users: 1 owner + 2 PMs + 2 clients");
  console.log("   - Projects: 7 (active, planning, completed)");
  console.log("   - Estimates: 8+ with multiple versions");
  console.log("   - Stages: 28 (4 per project)");
  console.log("\n🚀 Ready for demo at: buildos.designcorp.eu");
  console.log("   → Login: zbigniew@anchor-construction.pl");
  console.log("   → Or open as client: jan@investment-group.pl");
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
