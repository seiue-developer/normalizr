import { isImmutable } from './ImmutableUtils';
import PolymorphicSchema from './Polymorphic';

const DELETED_ITEM = Symbol.for('normalizr_deleted_item_symbol');

const validateSchema = (definition) => {
  const isArray = Array.isArray(definition);
  if (isArray && definition.length > 1) {
    throw new Error(`Expected schema definition to be a single schema, but found ${definition.length}.`);
  }

  return definition[0];
};

const getValues = (input) => (Array.isArray(input) ? input : Object.keys(input).map((key) => input[key]));

export const normalize = (schema, input, parent, key, visit, addEntity, visitedEntities) => {
  schema = validateSchema(schema);

  const values = getValues(input);

  // Special case: Arrays pass *their* parent on to their children, since there
  // is not any special information that can be gathered from themselves directly
  return values.map((value, index) => visit(value, parent, key, schema, addEntity, visitedEntities));
};

export const denormalize = (schema, input, unvisit) => {
  schema = validateSchema(schema);
  if (isImmutable(input) && input.map && input.filter) {
    return input
      .map((entityOrId) => {
        const unvisited = unvisit(entityOrId, schema);
        return unvisited === entityOrId || unvisited ? unvisited : DELETED_ITEM;
      })
      .filter((entity) => entity !== DELETED_ITEM);
  } else if (Array.isArray(input)) {
    return input.reduce((array, entityOrId) => {
      const unvisited = unvisit(entityOrId, schema);
      if (unvisited === entityOrId || unvisited) {
        array.push(unvisited);
      }
      return array;
    }, []);
  }
  return input;
};

export default class ArraySchema extends PolymorphicSchema {
  normalize(input, parent, key, visit, addEntity, visitedEntities) {
    const values = getValues(input);

    return values
      .map((value, index) => this.normalizeValue(value, parent, key, visit, addEntity, visitedEntities))
      .filter((value) => value !== undefined && value !== null);
  }

  denormalize(input, unvisit) {
    return input && input.map ? input.map((value) => this.denormalizeValue(value, unvisit)) : input;
  }
}
