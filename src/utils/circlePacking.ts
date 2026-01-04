export interface Circle {
    id: string;
    value: number;
    r: number;
    x: number;
    y: number;
}

/**
 * A simple circle packing algorithm.
 * It places circles spiraling out from the center, trying to keep them close.
 */
export function packCircles(
    data: { id: string; value: number }[],
    options: { minRadius: number; maxRadius: number; padding: number }
): Circle[] {
    const { minRadius, maxRadius, padding } = options;

    // 1. Calculate radii based on value
    const maxVal = Math.max(...data.map(d => d.value));

    const circles: Circle[] = data.map(item => {
        // Scale radius: simple sqrt scale for area proportionality
        // But clamped between min and max
        const ratio = Math.sqrt(item.value / maxVal);
        const r = minRadius + (maxRadius - minRadius) * ratio;
        return {
            id: item.id,
            value: item.value,
            r,
            x: 0,
            y: 0
        };
    });

    // 2. Sort by size (largest first usually packs better in center)
    circles.sort((a, b) => b.r - a.r);

    // 3. Place circles
    // We'll use a simple approach: place first at 0,0.
    // For others, search along a spiral for the first spot that doesn't overlap.

    const placedCircles: Circle[] = [];

    for (const circle of circles) {
        if (placedCircles.length === 0) {
            circle.x = 0;
            circle.y = 0;
            placedCircles.push(circle);
            continue;
        }

        // Spiral search
        let angle = 0;
        let distance = 0;
        const step = 10; // Increased step size for faster convergence
        const angleStep = 0.5; // Increased angle step
        let iterations = 0;
        const MAX_ITERATIONS = 2000; // Safety break

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            // Check collision with all placed circles
            let collision = false;
            for (const placed of placedCircles) {
                const dx = x - placed.x;
                const dy = y - placed.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < circle.r + placed.r + padding) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                circle.x = x;
                circle.y = y;
                placedCircles.push(circle);
                break;
            }

            // Move along spiral
            angle += angleStep;
            distance += step * angleStep / (2 * Math.PI);
        }

        // Fallback if max iterations reached (should rarely happen with these params)
        if (iterations >= MAX_ITERATIONS) {
            // Place it far away or just accept overlap to avoid crash
            // For now, let's just place it at the last checked position
            circle.x = Math.cos(angle) * distance;
            circle.y = Math.sin(angle) * distance;
            placedCircles.push(circle);
        }
    }

    return placedCircles;
}
