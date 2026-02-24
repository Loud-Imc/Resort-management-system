const { Client } = require('pg');

async function fix() {
    const client = new Client({
        connectionString: "postgresql://postgres:kamaru%40123@localhost:5432/resort_management"
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Check if idImage exists
        const checkCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='idImage'
        `);

        if (checkCol.rows.length === 0) {
            console.log('Adding column idImage to users table...');
            await client.query('ALTER TABLE users ADD COLUMN "idImage" TEXT');
        } else {
            console.log('Column idImage already exists');
        }

        // Check if phone unique constraint exists
        const checkUnique = await client.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conname = 'users_phone_key'
        `);

        if (checkUnique.rows.length === 0) {
            console.log('Adding unique constraint to phone column...');
            // Need to handle nulls/duplicates? Prisma unique allows multiple nulls in Postgres.
            await client.query('ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone)');
        } else {
            console.log('Unique constraint on phone already exists');
        }

        console.log('Database fix completed successfully');
    } catch (err) {
        console.error('Error fixing database:', err);
    } finally {
        await client.end();
    }
}

fix();
