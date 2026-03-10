import { d as entityKind, N as TableName, O as ColumnBuilder, C as Column, s as sql, T as Table } from './index2-BRX5Berz.js';
import { E as getColumnNameAndConfig, F as textDecoder } from './relations-RUcwMH1L.js';

class ForeignKeyBuilder {
  static [entityKind] = "SQLiteForeignKeyBuilder";
  /** @internal */
  reference;
  /** @internal */
  _onUpdate;
  /** @internal */
  _onDelete;
  constructor(config, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action;
    return this;
  }
  /** @internal */
  build(table) {
    return new ForeignKey(table, this);
  }
}
class ForeignKey {
  constructor(table, builder) {
    this.table = table;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "SQLiteForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
}

function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}

class SQLiteColumnBuilder extends ColumnBuilder {
  static [entityKind] = "SQLiteColumnBuilder";
  foreignKeyConfigs = [];
  references(ref, actions = {}) {
    this.foreignKeyConfigs.push({ ref, actions });
    return this;
  }
  unique(name) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    return this;
  }
  generatedAlwaysAs(as, config) {
    this.config.generated = {
      as,
      type: "always",
      mode: config?.mode ?? "virtual"
    };
    return this;
  }
  /** @internal */
  buildForeignKeys(column, table) {
    return this.foreignKeyConfigs.map(({ ref, actions }) => {
      return ((ref2, actions2) => {
        const builder = new ForeignKeyBuilder(() => {
          const foreignColumn = ref2();
          return { columns: [column], foreignColumns: [foreignColumn] };
        });
        if (actions2.onUpdate) {
          builder.onUpdate(actions2.onUpdate);
        }
        if (actions2.onDelete) {
          builder.onDelete(actions2.onDelete);
        }
        return builder.build(table);
      })(ref, actions);
    });
  }
}
class SQLiteColumn extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "SQLiteColumn";
}

class SQLiteBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteBigInt");
  }
  /** @internal */
  build(table) {
    return new SQLiteBigInt(table, this.config);
  }
}
class SQLiteBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteBigInt";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return BigInt(buf.toString("utf8"));
    }
    return BigInt(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(value.toString());
  }
}
class SQLiteBlobJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteBlobJson");
  }
  /** @internal */
  build(table) {
    return new SQLiteBlobJson(
      table,
      this.config
    );
  }
}
class SQLiteBlobJson extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobJson";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return JSON.parse(buf.toString("utf8"));
    }
    return JSON.parse(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(JSON.stringify(value));
  }
}
class SQLiteBlobBufferBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobBufferBuilder";
  constructor(name) {
    super(name, "buffer", "SQLiteBlobBuffer");
  }
  /** @internal */
  build(table) {
    return new SQLiteBlobBuffer(table, this.config);
  }
}
class SQLiteBlobBuffer extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobBuffer";
  mapFromDriverValue(value) {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    return Buffer.from(value);
  }
  getSQLType() {
    return "blob";
  }
}
function blob(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "json") {
    return new SQLiteBlobJsonBuilder(name);
  }
  if (config?.mode === "bigint") {
    return new SQLiteBigIntBuilder(name);
  }
  return new SQLiteBlobBufferBuilder(name);
}

class SQLiteCustomColumnBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "SQLiteCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  /** @internal */
  build(table) {
    return new SQLiteCustomColumn(
      table,
      this.config
    );
  }
}
class SQLiteCustomColumn extends SQLiteColumn {
  static [entityKind] = "SQLiteCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table, config) {
    super(table, config);
    this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
    this.mapTo = config.customTypeParams.toDriver;
    this.mapFrom = config.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
}
function customType(customTypeParams) {
  return (a, b) => {
    const { name, config } = getColumnNameAndConfig(a, b);
    return new SQLiteCustomColumnBuilder(
      name,
      config,
      customTypeParams
    );
  };
}

class SQLiteBaseIntegerBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBaseIntegerBuilder";
  constructor(name, dataType, columnType) {
    super(name, dataType, columnType);
    this.config.autoIncrement = false;
  }
  primaryKey(config) {
    if (config?.autoIncrement) {
      this.config.autoIncrement = true;
    }
    this.config.hasDefault = true;
    return super.primaryKey();
  }
}
class SQLiteBaseInteger extends SQLiteColumn {
  static [entityKind] = "SQLiteBaseInteger";
  autoIncrement = this.config.autoIncrement;
  getSQLType() {
    return "integer";
  }
}
class SQLiteIntegerBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteIntegerBuilder";
  constructor(name) {
    super(name, "number", "SQLiteInteger");
  }
  build(table) {
    return new SQLiteInteger(
      table,
      this.config
    );
  }
}
class SQLiteInteger extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteInteger";
}
class SQLiteTimestampBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteTimestampBuilder";
  constructor(name, mode) {
    super(name, "date", "SQLiteTimestamp");
    this.config.mode = mode;
  }
  /**
   * @deprecated Use `default()` with your own expression instead.
   *
   * Adds `DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))` to the column, which is the current epoch timestamp in milliseconds.
   */
  defaultNow() {
    return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
  }
  build(table) {
    return new SQLiteTimestamp(
      table,
      this.config
    );
  }
}
class SQLiteTimestamp extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteTimestamp";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    if (this.config.mode === "timestamp") {
      return new Date(value * 1e3);
    }
    return new Date(value);
  }
  mapToDriverValue(value) {
    const unix = value.getTime();
    if (this.config.mode === "timestamp") {
      return Math.floor(unix / 1e3);
    }
    return unix;
  }
}
class SQLiteBooleanBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteBooleanBuilder";
  constructor(name, mode) {
    super(name, "boolean", "SQLiteBoolean");
    this.config.mode = mode;
  }
  build(table) {
    return new SQLiteBoolean(
      table,
      this.config
    );
  }
}
class SQLiteBoolean extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteBoolean";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    return Number(value) === 1;
  }
  mapToDriverValue(value) {
    return value ? 1 : 0;
  }
}
function integer(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "timestamp" || config?.mode === "timestamp_ms") {
    return new SQLiteTimestampBuilder(name, config.mode);
  }
  if (config?.mode === "boolean") {
    return new SQLiteBooleanBuilder(name, config.mode);
  }
  return new SQLiteIntegerBuilder(name);
}

class SQLiteNumericBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBuilder";
  constructor(name) {
    super(name, "string", "SQLiteNumeric");
  }
  /** @internal */
  build(table) {
    return new SQLiteNumeric(
      table,
      this.config
    );
  }
}
class SQLiteNumeric extends SQLiteColumn {
  static [entityKind] = "SQLiteNumeric";
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    return String(value);
  }
  getSQLType() {
    return "numeric";
  }
}
class SQLiteNumericNumberBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericNumberBuilder";
  constructor(name) {
    super(name, "number", "SQLiteNumericNumber");
  }
  /** @internal */
  build(table) {
    return new SQLiteNumericNumber(
      table,
      this.config
    );
  }
}
class SQLiteNumericNumber extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericNumber";
  mapFromDriverValue(value) {
    if (typeof value === "number") return value;
    return Number(value);
  }
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}
class SQLiteNumericBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteNumericBigInt");
  }
  /** @internal */
  build(table) {
    return new SQLiteNumericBigInt(
      table,
      this.config
    );
  }
}
class SQLiteNumericBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericBigInt";
  mapFromDriverValue = BigInt;
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}
function numeric(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  const mode = config?.mode;
  return mode === "number" ? new SQLiteNumericNumberBuilder(name) : mode === "bigint" ? new SQLiteNumericBigIntBuilder(name) : new SQLiteNumericBuilder(name);
}

class SQLiteRealBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteRealBuilder";
  constructor(name) {
    super(name, "number", "SQLiteReal");
  }
  /** @internal */
  build(table) {
    return new SQLiteReal(table, this.config);
  }
}
class SQLiteReal extends SQLiteColumn {
  static [entityKind] = "SQLiteReal";
  getSQLType() {
    return "real";
  }
}
function real(name) {
  return new SQLiteRealBuilder(name ?? "");
}

class SQLiteTextBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextBuilder";
  constructor(name, config) {
    super(name, "string", "SQLiteText");
    this.config.enumValues = config.enum;
    this.config.length = config.length;
  }
  /** @internal */
  build(table) {
    return new SQLiteText(
      table,
      this.config
    );
  }
}
class SQLiteText extends SQLiteColumn {
  static [entityKind] = "SQLiteText";
  enumValues = this.config.enumValues;
  length = this.config.length;
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return `text${this.config.length ? `(${this.config.length})` : ""}`;
  }
}
class SQLiteTextJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteTextJson");
  }
  /** @internal */
  build(table) {
    return new SQLiteTextJson(
      table,
      this.config
    );
  }
}
class SQLiteTextJson extends SQLiteColumn {
  static [entityKind] = "SQLiteTextJson";
  getSQLType() {
    return "text";
  }
  mapFromDriverValue(value) {
    return JSON.parse(value);
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
}
function text(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config.mode === "json") {
    return new SQLiteTextJsonBuilder(name);
  }
  return new SQLiteTextBuilder(name, config);
}

function getSQLiteColumnBuilders() {
  return {
    blob,
    customType,
    integer,
    numeric,
    real,
    text
  };
}

const InlineForeignKeys = Symbol.for("drizzle:SQLiteInlineForeignKeys");
class SQLiteTable extends Table {
  static [entityKind] = "SQLiteTable";
  /** @internal */
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys
  });
  /** @internal */
  [Table.Symbol.Columns];
  /** @internal */
  [InlineForeignKeys] = [];
  /** @internal */
  [Table.Symbol.ExtraConfigBuilder] = void 0;
}
function sqliteTableBase(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new SQLiteTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getSQLiteColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name2, column];
    })
  );
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumns;
  if (extraConfig) {
    table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return table;
}
const sqliteTable = (name, columns, extraConfig) => {
  return sqliteTableBase(name, columns, extraConfig);
};

export { SQLiteTable as S, SQLiteColumn as a, integer as i, sqliteTable as s, text as t };
//# sourceMappingURL=table-CL0lhLuY.js.map
