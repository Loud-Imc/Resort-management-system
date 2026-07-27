const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    const diff = execSync('npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script', {
        encoding: 'utf-8',
        cwd: __dirname,
    });

    console.log('Migration Diff generated successfully!');
    console.log('Diff length:', diff.length);

    // Create a new migration folder
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const folderName = `${timestamp}_sync_pushed_schema_changes`;
    const targetDir = path.join(__dirname, 'prisma', 'migrations', folderName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const migrationFilePath = path.join(targetDir, 'migration.sql');
    fs.writeFileSync(migrationFilePath, diff, 'utf-8');

    console.log('Migration file saved to:', migrationFilePath);
} catch (err) {
    console.error('Error generating migration:', err);
}
