/**
 * Validates a customFields object against LeadField definitions.
 * Returns { errors, values } - values contains only valid, normalised entries.
 * Rules: unknown keys are rejected, required fields must be present,
 * types are strict (a number must be a JSON number, not "10").
 */
function validateCustomFields(input, definitions) {
  const errors = [];
  const values = {};
  const known = new Set(definitions.map((d) => d.name));

  for (const key of Object.keys(input)) {
    if (!known.has(key)) errors.push({ field: `customFields.${key}`, message: 'Unknown custom field' });
  }

  for (const def of definitions) {
    const field = `customFields.${def.name}`;
    const v = input[def.name];

    if (v === undefined || v === null || v === '') {
      if (def.required) errors.push({ field, message: `${def.label} is required` });
      continue;
    }

    switch (def.type) {
      case 'text':
        if (typeof v !== 'string') errors.push({ field, message: `${def.label} must be text` });
        else values[def.name] = v.trim();
        break;
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v)) errors.push({ field, message: `${def.label} must be a number` });
        else values[def.name] = v;
        break;
      case 'boolean':
        if (typeof v !== 'boolean') errors.push({ field, message: `${def.label} must be true or false` });
        else values[def.name] = v;
        break;
      case 'date':
        if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) errors.push({ field, message: `${def.label} must be a valid date string` });
        else values[def.name] = new Date(v).toISOString();
        break;
      case 'select':
        if (typeof v !== 'string' || !def.options.includes(v)) {
          errors.push({ field, message: `${def.label} must be one of: ${def.options.join(', ')}` });
        } else values[def.name] = v;
        break;
    }
  }
  return { errors, values };
}

module.exports = { validateCustomFields };
