var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/sql.js/dist/sql-wasm.js
var require_sql_wasm = __commonJS({
  "node_modules/sql.js/dist/sql-wasm.js"(exports, module) {
    var initSqlJsPromise = void 0;
    var initSqlJs2 = /* @__PURE__ */ __name(function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module = void 0;
        var k;
        k ||= typeof Module != "undefined" ? Module : {};
        var aa = !!globalThis.window, ba = !!globalThis.WorkerGlobalScope, ca = globalThis.process?.versions?.node && "renderer" != globalThis.process?.type;
        k.onRuntimeInitialized = function() {
          function a(f, l) {
            switch (typeof l) {
              case "boolean":
                dc(f, l ? 1 : 0);
                break;
              case "number":
                ec(f, l);
                break;
              case "string":
                fc(f, l, -1, -1);
                break;
              case "object":
                if (null === l) lb(f);
                else if (null != l.length) {
                  var n = da(l.length);
                  m.set(l, n);
                  gc(f, n, l.length, -1);
                  ea(n);
                } else va(f, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                lb(f);
            }
          }
          __name(a, "a");
          function b(f, l) {
            for (var n = [], p = 0; p < f; p += 1) {
              var r = t(l + 4 * p, "i32"), w = hc(r);
              if (1 === w || 2 === w) r = ic(r);
              else if (3 === w) r = jc(r);
              else if (4 === w) {
                w = r;
                r = kc(w);
                w = lc(w);
                for (var J = new Uint8Array(r), I = 0; I < r; I += 1) J[I] = m[w + I];
                r = J;
              } else r = null;
              n.push(r);
            }
            return n;
          }
          __name(b, "b");
          function c(f, l) {
            this.Qa = f;
            this.db = l;
            this.Oa = 1;
            this.mb = [];
          }
          __name(c, "c");
          function d(f, l) {
            this.db = l;
            this.fb = fa(f);
            if (null === this.fb) throw Error("Unable to allocate memory for the SQL string");
            this.lb = this.fb;
            this.$a = this.sb = null;
          }
          __name(d, "d");
          function e(f) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != f) {
              var l = this.filename, n = "/", p = l;
              n && (n = "string" == typeof n ? n : ha(n), p = l ? ia(n + "/" + l) : n);
              l = ja(true, true);
              p = ka(
                p,
                l
              );
              if (f) {
                if ("string" == typeof f) {
                  n = Array(f.length);
                  for (var r = 0, w = f.length; r < w; ++r) n[r] = f.charCodeAt(r);
                  f = n;
                }
                ma(p, l | 146);
                n = na(p, 577);
                oa(n, f, 0, f.length, 0);
                pa(n);
                ma(p, l);
              }
            }
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            this.gb = {};
            this.Sa = {};
          }
          __name(e, "e");
          var g = y(4), h = k.cwrap, q = h("sqlite3_open", "number", ["string", "number"]), v = h("sqlite3_close_v2", "number", ["number"]), u = h("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = h("sqlite3_changes", "number", ["number"]), D = h(
            "sqlite3_prepare_v2",
            "number",
            ["number", "string", "number", "number", "number"]
          ), pb = h("sqlite3_sql", "string", ["number"]), nc = h("sqlite3_normalized_sql", "string", ["number"]), qb = h("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), oc = h("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), rb = h("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), pc = h("sqlite3_bind_double", "number", ["number", "number", "number"]), qc = h("sqlite3_bind_int", "number", [
            "number",
            "number",
            "number"
          ]), rc = h("sqlite3_bind_parameter_index", "number", ["number", "string"]), sc = h("sqlite3_step", "number", ["number"]), tc = h("sqlite3_errmsg", "string", ["number"]), uc = h("sqlite3_column_count", "number", ["number"]), vc = h("sqlite3_data_count", "number", ["number"]), wc = h("sqlite3_column_double", "number", ["number", "number"]), sb = h("sqlite3_column_text", "string", ["number", "number"]), xc = h("sqlite3_column_blob", "number", ["number", "number"]), yc = h("sqlite3_column_bytes", "number", ["number", "number"]), zc = h(
            "sqlite3_column_type",
            "number",
            ["number", "number"]
          ), Ac = h("sqlite3_column_name", "string", ["number", "number"]), Bc = h("sqlite3_reset", "number", ["number"]), Cc = h("sqlite3_clear_bindings", "number", ["number"]), Dc = h("sqlite3_finalize", "number", ["number"]), tb = h("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), hc = h("sqlite3_value_type", "number", ["number"]), kc = h("sqlite3_value_bytes", "number", ["number"]), jc = h("sqlite3_value_text", "string", ["number"]), lc = h(
            "sqlite3_value_blob",
            "number",
            ["number"]
          ), ic = h("sqlite3_value_double", "number", ["number"]), ec = h("sqlite3_result_double", "", ["number", "number"]), lb = h("sqlite3_result_null", "", ["number"]), fc = h("sqlite3_result_text", "", ["number", "string", "number", "number"]), gc = h("sqlite3_result_blob", "", ["number", "number", "number", "number"]), dc = h("sqlite3_result_int", "", ["number", "number"]), va = h("sqlite3_result_error", "", ["number", "string", "number"]), ub = h("sqlite3_aggregate_context", "number", ["number", "number"]), ob = h(
            "RegisterExtensionFunctions",
            "number",
            ["number"]
          ), vb = h("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(f) {
            if (!this.Qa) throw "Statement closed";
            this.reset();
            return Array.isArray(f) ? this.Gb(f) : null != f && "object" === typeof f ? this.Hb(f) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa) throw "Statement closed";
            this.Oa = 1;
            var f = sc(this.Qa);
            switch (f) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(f);
            }
          };
          c.prototype.Ab = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return wc(this.Qa, f);
          };
          c.prototype.Ob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            f = sb(this.Qa, f);
            if ("function" !== typeof BigInt) throw Error("BigInt is not supported");
            return BigInt(f);
          };
          c.prototype.Tb = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return sb(this.Qa, f);
          };
          c.prototype.getBlob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            var l = yc(this.Qa, f);
            f = xc(this.Qa, f);
            for (var n = new Uint8Array(l), p = 0; p < l; p += 1) n[p] = m[f + p];
            return n;
          };
          c.prototype.get = function(f, l) {
            l = l || {};
            null != f && this.bind(f) && this.step();
            f = [];
            for (var n = vc(this.Qa), p = 0; p < n; p += 1) switch (zc(this.Qa, p)) {
              case 1:
                var r = l.useBigInt ? this.Ob(p) : this.Ab(p);
                f.push(r);
                break;
              case 2:
                f.push(this.Ab(p));
                break;
              case 3:
                f.push(this.Tb(p));
                break;
              case 4:
                f.push(this.getBlob(p));
                break;
              default:
                f.push(null);
            }
            return f;
          };
          c.prototype.qb = function() {
            for (var f = [], l = uc(this.Qa), n = 0; n < l; n += 1) f.push(Ac(this.Qa, n));
            return f;
          };
          c.prototype.zb = function(f, l) {
            f = this.get(f, l);
            l = this.qb();
            for (var n = {}, p = 0; p < l.length; p += 1) n[l[p]] = f[p];
            return n;
          };
          c.prototype.Sb = function() {
            return pb(this.Qa);
          };
          c.prototype.Pb = function() {
            return nc(this.Qa);
          };
          c.prototype.run = function(f) {
            null != f && this.bind(f);
            this.step();
            return this.reset();
          };
          c.prototype.wb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            f = fa(f);
            this.mb.push(f);
            this.db.handleError(oc(this.Qa, l, f, -1, 0));
          };
          c.prototype.Fb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = da(f.length);
            m.set(f, n);
            this.mb.push(n);
            this.db.handleError(rb(this.Qa, l, n, f.length, 0));
          };
          c.prototype.vb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((f === (f | 0) ? qc : pc)(
              this.Qa,
              l,
              f
            ));
          };
          c.prototype.Ib = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            rb(this.Qa, f, 0, 0, 0);
          };
          c.prototype.xb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof f) {
              case "string":
                this.wb(f, l);
                return;
              case "number":
                this.vb(f, l);
                return;
              case "bigint":
                this.wb(f.toString(), l);
                return;
              case "boolean":
                this.vb(f + 0, l);
                return;
              case "object":
                if (null === f) {
                  this.Ib(l);
                  return;
                }
                if (null != f.length) {
                  this.Fb(f, l);
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + f + ").";
          };
          c.prototype.Hb = function(f) {
            var l = this;
            Object.keys(f).forEach(function(n) {
              var p = rc(l.Qa, n);
              0 !== p && l.xb(f[n], p);
            });
            return true;
          };
          c.prototype.Gb = function(f) {
            for (var l = 0; l < f.length; l += 1) this.xb(f[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.freemem();
            return 0 === Cc(this.Qa) && 0 === Bc(this.Qa);
          };
          c.prototype.freemem = function() {
            for (var f; void 0 !== (f = this.mb.pop()); ) ea(f);
          };
          c.prototype.Ya = function() {
            this.freemem();
            var f = 0 === Dc(this.Qa);
            delete this.db.gb[this.Qa];
            this.Qa = 0;
            return f;
          };
          d.prototype.next = function() {
            if (null === this.fb) return { done: true };
            null !== this.$a && (this.$a.Ya(), this.$a = null);
            if (!this.db.db) throw this.ob(), Error("Database closed");
            var f = qa(), l = y(4);
            ra(g);
            ra(l);
            try {
              this.db.handleError(qb(this.db.db, this.lb, -1, g, l));
              this.lb = t(l, "i32");
              var n = t(g, "i32");
              if (0 === n) return this.ob(), { done: true };
              this.$a = new c(n, this.db);
              this.db.gb[n] = this.$a;
              return { value: this.$a, done: false };
            } catch (p) {
              throw this.sb = z(this.lb), this.ob(), p;
            } finally {
              sa(f);
            }
          };
          d.prototype.ob = function() {
            ea(this.fb);
            this.fb = null;
          };
          d.prototype.Qb = function() {
            return null !== this.sb ? this.sb : z(this.lb);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.run = function(f, l) {
            if (!this.db) throw "Database closed";
            if (l) {
              f = this.tb(f, l);
              try {
                f.step();
              } finally {
                f.Ya();
              }
            } else this.handleError(u(this.db, f, 0, 0, g));
            return this;
          };
          e.prototype.exec = function(f, l, n) {
            if (!this.db) throw "Database closed";
            var p = qa(), r = null, w = null, J = null;
            try {
              J = w = fa(f);
              var I = y(4);
              for (f = []; 0 !== t(J, "i8"); ) {
                ra(g);
                ra(I);
                this.handleError(qb(this.db, J, -1, g, I));
                var L = t(g, "i32");
                J = t(I, "i32");
                if (0 !== L) {
                  var G = null;
                  r = new c(L, this);
                  for (null != l && r.bind(l); r.step(); ) null === G && (G = { columns: r.qb(), values: [] }, f.push(G)), G.values.push(r.get(null, n));
                  r.Ya();
                }
              }
              return f;
            } catch (la) {
              throw r && r.Ya(), la;
            } finally {
              w && ea(w), sa(p);
            }
          };
          e.prototype.Mb = function(f, l, n, p, r) {
            "function" === typeof l && (p = n, n = l, l = void 0);
            f = this.tb(f, l);
            try {
              for (; f.step(); ) n(f.zb(null, r));
            } finally {
              f.Ya();
            }
            if ("function" === typeof p) return p();
          };
          e.prototype.tb = function(f, l) {
            ra(g);
            this.handleError(D(this.db, f, -1, g, 0));
            f = t(g, "i32");
            if (0 === f) throw "Nothing to prepare";
            var n = new c(f, this);
            null != l && n.bind(l);
            return this.gb[f] = n;
          };
          e.prototype.Ub = function(f) {
            return new d(f, this);
          };
          e.prototype.Nb = function() {
            Object.values(this.gb).forEach(function(l) {
              l.Ya();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(v(this.db));
            var f = ta(this.filename);
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            return f;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.gb).forEach(function(f) {
              f.Ya();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.Za && (A(this.Za), this.Za = void 0), this.handleError(v(this.db)), ua("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(f) {
            if (0 === f) return null;
            f = tc(this.db);
            throw Error(f);
          };
          e.prototype.Rb = function() {
            return x(this.db);
          };
          e.prototype.Kb = function(f, l) {
            Object.prototype.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            var n = wa(function(p, r, w) {
              r = b(r, w);
              try {
                var J = l.apply(null, r);
              } catch (I) {
                va(p, I, -1);
                return;
              }
              a(p, J);
            }, "viii");
            this.Sa[f] = n;
            this.handleError(tb(this.db, f, l.length, 1, 0, n, 0, 0, 0));
            return this;
          };
          e.prototype.Jb = function(f, l) {
            var n = l.init || function() {
              return null;
            }, p = l.finalize || function(L) {
              return L;
            }, r = l.step;
            if (!r) throw "An aggregate function must have a step function in " + f;
            var w = {};
            Object.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            l = f + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var J = wa(function(L, G, la) {
              var V = ub(L, 1);
              Object.hasOwnProperty.call(w, V) || (w[V] = n());
              G = b(G, la);
              G = [w[V]].concat(G);
              try {
                w[V] = r.apply(null, G);
              } catch (Fc) {
                delete w[V], va(L, Fc, -1);
              }
            }, "viii"), I = wa(function(L) {
              var G = ub(L, 1);
              try {
                var la = p(w[G]);
              } catch (V) {
                delete w[G];
                va(L, V, -1);
                return;
              }
              a(L, la);
              delete w[G];
            }, "vi");
            this.Sa[f] = J;
            this.Sa[l] = I;
            this.handleError(tb(this.db, f, r.length - 1, 1, 0, 0, J, I, 0));
            return this;
          };
          e.prototype.Zb = function(f) {
            this.Za && (vb(this.db, 0, 0), A(this.Za), this.Za = void 0);
            if (!f) return this;
            this.Za = wa(function(l, n, p, r, w) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              p = z(p);
              r = z(r);
              if (w > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
              f(l, p, r, Number(w));
            }, "viiiij");
            vb(this.db, this.Za, 0);
            return this;
          };
          c.prototype.bind = c.prototype.bind;
          c.prototype.step = c.prototype.step;
          c.prototype.get = c.prototype.get;
          c.prototype.getColumnNames = c.prototype.qb;
          c.prototype.getAsObject = c.prototype.zb;
          c.prototype.getSQL = c.prototype.Sb;
          c.prototype.getNormalizedSQL = c.prototype.Pb;
          c.prototype.run = c.prototype.run;
          c.prototype.reset = c.prototype.reset;
          c.prototype.freemem = c.prototype.freemem;
          c.prototype.free = c.prototype.Ya;
          d.prototype.next = d.prototype.next;
          d.prototype.getRemainingSQL = d.prototype.Qb;
          e.prototype.run = e.prototype.run;
          e.prototype.exec = e.prototype.exec;
          e.prototype.each = e.prototype.Mb;
          e.prototype.prepare = e.prototype.tb;
          e.prototype.iterateStatements = e.prototype.Ub;
          e.prototype["export"] = e.prototype.Nb;
          e.prototype.close = e.prototype.close;
          e.prototype.handleError = e.prototype.handleError;
          e.prototype.getRowsModified = e.prototype.Rb;
          e.prototype.create_function = e.prototype.Kb;
          e.prototype.create_aggregate = e.prototype.Jb;
          e.prototype.updateHook = e.prototype.Zb;
          k.Database = e;
        };
        var xa = "./this.program", ya = /* @__PURE__ */ __name((a, b) => {
          throw b;
        }, "ya"), za = globalThis.document?.currentScript?.src;
        "undefined" != typeof __filename ? za = __filename : ba && (za = self.location.href);
        var Aa = "", Ba, Ca;
        if (ca) {
          var fs = __require("node:fs");
          Aa = __dirname + "/";
          Ca = /* @__PURE__ */ __name((a) => {
            a = Da(a) ? new URL(a) : a;
            return fs.readFileSync(a);
          }, "Ca");
          Ba = /* @__PURE__ */ __name(async (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs.readFileSync(a, void 0);
          }, "Ba");
          1 < process.argv.length && (xa = process.argv[1].replace(/\\/g, "/"));
          process.argv.slice(2);
          "undefined" != typeof module && (module.exports = k);
          ya = /* @__PURE__ */ __name((a, b) => {
            process.exitCode = a;
            throw b;
          }, "ya");
        } else if (aa || ba) {
          try {
            Aa = new URL(".", za).href;
          } catch {
          }
          ba && (Ca = /* @__PURE__ */ __name((a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, false);
            b.responseType = "arraybuffer";
            b.send(null);
            return new Uint8Array(b.response);
          }, "Ca"));
          Ba = /* @__PURE__ */ __name(async (a) => {
            if (Da(a)) return new Promise((c, d) => {
              var e = new XMLHttpRequest();
              e.open("GET", a, true);
              e.responseType = "arraybuffer";
              e.onload = () => {
                200 == e.status || 0 == e.status && e.response ? c(e.response) : d(e.status);
              };
              e.onerror = d;
              e.send(null);
            });
            var b = await fetch(a, { credentials: "same-origin" });
            if (b.ok) return b.arrayBuffer();
            throw Error(b.status + " : " + b.url);
          }, "Ba");
        }
        var Ea = console.log.bind(console), B = console.error.bind(console), Fa, Ga = false, Ha, Da = /* @__PURE__ */ __name((a) => a.startsWith("file://"), "Da"), m, C, Ia, E, F, Ja, Ka, H;
        function La() {
          var a = Ma.buffer;
          m = new Int8Array(a);
          Ia = new Int16Array(a);
          C = new Uint8Array(a);
          new Uint16Array(a);
          E = new Int32Array(a);
          F = new Uint32Array(a);
          Ja = new Float32Array(a);
          Ka = new Float64Array(a);
          H = new BigInt64Array(a);
          new BigUint64Array(a);
        }
        __name(La, "La");
        function Na(a) {
          k.onAbort?.(a);
          a = "Aborted(" + a + ")";
          B(a);
          Ga = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        __name(Na, "Na");
        var Oa;
        async function Pa(a) {
          if (!Fa) try {
            var b = await Ba(a);
            return new Uint8Array(b);
          } catch {
          }
          if (a == Oa && Fa) a = new Uint8Array(Fa);
          else if (Ca) a = Ca(a);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        __name(Pa, "Pa");
        async function Qa(a, b) {
          try {
            var c = await Pa(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            B(`failed to asynchronously prepare wasm: ${d}`), Na(d);
          }
        }
        __name(Qa, "Qa");
        async function Ra(a) {
          var b = Oa;
          if (!Fa && !Da(b) && !ca) try {
            var c = fetch(b, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(c, a);
          } catch (d) {
            B(`wasm streaming compile failed: ${d}`), B("falling back to ArrayBuffer instantiation");
          }
          return Qa(b, a);
        }
        __name(Ra, "Ra");
        class Sa {
          static {
            __name(this, "Sa");
          }
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Ta = /* @__PURE__ */ __name((a) => {
          for (; 0 < a.length; ) a.shift()(k);
        }, "Ta"), Ua = [], Va = [], Wa = /* @__PURE__ */ __name(() => {
          var a = k.preRun.shift();
          Va.push(a);
        }, "Wa"), K = 0, Xa = null;
        function t(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return m[a];
            case "i8":
              return m[a];
            case "i16":
              return Ia[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return H[a >> 3];
            case "float":
              return Ja[a >> 2];
            case "double":
              return Ka[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Na(`invalid type for getValue: ${b}`);
          }
        }
        __name(t, "t");
        var Ya = true;
        function ra(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              m[a] = 0;
              break;
            case "i8":
              m[a] = 0;
              break;
            case "i16":
              Ia[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              H[a >> 3] = BigInt(0);
              break;
            case "float":
              Ja[a >> 2] = 0;
              break;
            case "double":
              Ka[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Na(`invalid type for setValue: ${b}`);
          }
        }
        __name(ra, "ra");
        var Za = new TextDecoder(), $a = /* @__PURE__ */ __name((a, b, c, d) => {
          c = b + c;
          if (d) return c;
          for (; a[b] && !(b >= c); ) ++b;
          return b;
        }, "$a"), z = /* @__PURE__ */ __name((a, b, c) => a ? Za.decode(C.subarray(a, $a(C, a, b, c))) : "", "z"), ab = /* @__PURE__ */ __name((a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b) for (; c; c--) a.unshift("..");
          return a;
        }, "ab"), ia = /* @__PURE__ */ __name((a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = ab(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, "ia"), bb = /* @__PURE__ */ __name((a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b) return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, "bb"), cb = /* @__PURE__ */ __name((a) => a && a.match(/([^\/]+|\/)\/*$/)[1], "cb"), db = /* @__PURE__ */ __name(() => {
          if (ca) {
            var a = __require("node:crypto");
            return (b) => a.randomFillSync(b);
          }
          return (b) => crypto.getRandomValues(b);
        }, "db"), eb = /* @__PURE__ */ __name((a) => {
          (eb = db())(a);
        }, "eb"), fb = /* @__PURE__ */ __name((...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c) throw new TypeError("Arguments to path.resolve must be strings");
            if (!c) return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = ab(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, "fb"), gb = /* @__PURE__ */ __name((a) => {
          var b = $a(a, 0);
          return Za.decode(a.buffer ? a.subarray(0, b) : new Uint8Array(a.slice(0, b)));
        }, "gb"), hb = [], ib = /* @__PURE__ */ __name((a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, "ib"), M = /* @__PURE__ */ __name((a, b, c, d) => {
          if (!(0 < d)) return 0;
          var e = c;
          d = c + d - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (c >= d) break;
              b[c++] = h;
            } else if (2047 >= h) {
              if (c + 1 >= d) break;
              b[c++] = 192 | h >> 6;
              b[c++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (c + 2 >= d) break;
              b[c++] = 224 | h >> 12;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
            } else {
              if (c + 3 >= d) break;
              b[c++] = 240 | h >> 18;
              b[c++] = 128 | h >> 12 & 63;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
              g++;
            }
          }
          b[c] = 0;
          return c - e;
        }, "M"), jb = [];
        function kb(a, b) {
          jb[a] = { input: [], output: [], eb: b };
          mb(a, nb);
        }
        __name(kb, "kb");
        var nb = { open(a) {
          var b = jb[a.node.rdev];
          if (!b) throw new N(43);
          a.tty = b;
          a.seekable = false;
        }, close(a) {
          a.tty.eb.fsync(a.tty);
        }, fsync(a) {
          a.tty.eb.fsync(a.tty);
        }, read(a, b, c, d) {
          if (!a.tty || !a.tty.eb.Bb) throw new N(60);
          for (var e = 0, g = 0; g < d; g++) {
            try {
              var h = a.tty.eb.Bb(a.tty);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === h && 0 === e) throw new N(6);
            if (null === h || void 0 === h) break;
            e++;
            b[c + g] = h;
          }
          e && (a.node.atime = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.tty || !a.tty.eb.ub) throw new N(60);
          try {
            for (var e = 0; e < d; e++) a.tty.eb.ub(a.tty, b[c + e]);
          } catch (g) {
            throw new N(29);
          }
          d && (a.node.mtime = a.node.ctime = Date.now());
          return e;
        } }, wb = { Bb() {
          a: {
            if (!hb.length) {
              var a = null;
              if (ca) {
                var b = Buffer.alloc(256), c = 0, d = process.stdin.fd;
                try {
                  c = fs.readSync(d, b, 0, 256);
                } catch (e) {
                  if (e.toString().includes("EOF")) c = 0;
                  else throw e;
                }
                0 < c && (a = b.slice(0, c).toString("utf-8"));
              } else globalThis.window?.prompt && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                a = null;
                break a;
              }
              b = Array(ib(a) + 1);
              a = M(a, b, 0, b.length);
              b.length = a;
              hb = b;
            }
            a = hb.shift();
          }
          return a;
        }, ub(a, b) {
          null === b || 10 === b ? (Ea(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (Ea(gb(a.output)), a.output = []);
        }, hc() {
          return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        }, ic() {
          return 0;
        }, jc() {
          return [24, 80];
        } }, xb = { ub(a, b) {
          null === b || 10 === b ? (B(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (B(gb(a.output)), a.output = []);
        } }, O = { Wa: null, Xa() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new N(63);
          O.Wa || (O.Wa = { dir: { node: { Ta: O.La.Ta, Ua: O.La.Ua, lookup: O.La.lookup, ib: O.La.ib, rename: O.La.rename, unlink: O.La.unlink, rmdir: O.La.rmdir, readdir: O.La.readdir, symlink: O.La.symlink }, stream: { Va: O.Ma.Va } }, file: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: { Va: O.Ma.Va, read: O.Ma.read, write: O.Ma.write, jb: O.Ma.jb, kb: O.Ma.kb } }, link: { node: { Ta: O.La.Ta, Ua: O.La.Ua, readlink: O.La.readlink }, stream: {} }, yb: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: yb } });
          c = zb(a, b, c, d);
          P(c.mode) ? (c.La = O.Wa.dir.node, c.Ma = O.Wa.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Wa.file.node, c.Ma = O.Wa.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Wa.link.node, c.Ma = O.Wa.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Wa.yb.node, c.Ma = O.Wa.yb.stream);
          c.atime = c.mtime = c.ctime = Date.now();
          a && (a.Na[b] = c, a.atime = a.mtime = a.ctime = c.atime);
          return c;
        }, fc(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: {
          Ta(a) {
            var b = {};
            b.dev = 8192 === (a.mode & 61440) ? a.id : 1;
            b.ino = a.id;
            b.mode = a.mode;
            b.nlink = 1;
            b.uid = 0;
            b.gid = 0;
            b.rdev = a.rdev;
            P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
            b.atime = new Date(a.atime);
            b.mtime = new Date(a.mtime);
            b.ctime = new Date(a.ctime);
            b.blksize = 4096;
            b.blocks = Math.ceil(b.size / b.blksize);
            return b;
          },
          Ua(a, b) {
            for (var c of ["mode", "atime", "mtime", "ctime"]) null != b[c] && (a[c] = b[c]);
            void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
          },
          lookup() {
            O.nb || (O.nb = new N(44), O.nb.stack = "<generic error, no stack>");
            throw O.nb;
          },
          ib(a, b, c, d) {
            return O.createNode(a, b, c, d);
          },
          rename(a, b, c) {
            try {
              var d = Q(b, c);
            } catch (g) {
            }
            if (d) {
              if (P(a.mode)) for (var e in d.Na) throw new N(55);
              Ab(d);
            }
            delete a.parent.Na[a.name];
            b.Na[c] = a;
            a.name = c;
            b.ctime = b.mtime = a.parent.ctime = a.parent.mtime = Date.now();
          },
          unlink(a, b) {
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          rmdir(a, b) {
            var c = Q(a, b), d;
            for (d in c.Na) throw new N(55);
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          readdir(a) {
            return [".", "..", ...Object.keys(a.Na)];
          },
          symlink(a, b, c) {
            a = O.createNode(a, b, 41471, 0);
            a.link = c;
            return a;
          },
          readlink(a) {
            if (40960 !== (a.mode & 61440)) throw new N(28);
            return a.link;
          }
        }, Ma: { read(a, b, c, d, e) {
          var g = a.node.Na;
          if (e >= a.node.Ra) return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && g.subarray) b.set(g.subarray(e, e + a), c);
          else for (d = 0; d < a; d++) b[c + d] = g[e + d];
          return a;
        }, write(a, b, c, d, e, g) {
          b.buffer === m.buffer && (g = false);
          if (!d) return 0;
          a = a.node;
          a.mtime = a.ctime = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (g) return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e) return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra) return a.Na.set(b.subarray(c, c + d), e), d;
          }
          g = e + d;
          var h = a.Na ? a.Na.length : 0;
          h >= g || (g = Math.max(g, h * (1048576 > h ? 2 : 1.125) >>> 0), 0 != h && (g = Math.max(g, 256)), h = a.Na, a.Na = new Uint8Array(g), 0 < a.Ra && a.Na.set(h.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray) a.Na.set(b.subarray(c, c + d), e);
          else for (g = 0; g < d; g++) a.Na[e + g] = b[c + g];
          a.Ra = Math.max(a.Ra, e + d);
          return d;
        }, Va(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b) throw new N(28);
          return b;
        }, jb(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440)) throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== m.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var g = Bb(65536, d);
            g && C.fill(0, g, g + d);
            d = g;
            if (!d) throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              m.set(a, d);
            }
          } else e = false, d = a.byteOffset;
          return { Xb: d, Eb: e };
        }, kb(a, b, c, d) {
          O.Ma.write(a, b, 0, d, c, false);
          return 0;
        } } }, ja = /* @__PURE__ */ __name((a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, "ja"), Cb = null, Db = {}, Eb = [], Fb = 1, R = null, Gb = false, Hb = true, Ib = {}, N = class {
          static {
            __name(this, "N");
          }
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Jb = class {
          static {
            __name(this, "Jb");
          }
          hb = {};
          node = null;
          get flags() {
            return this.hb.flags;
          }
          set flags(a) {
            this.hb.flags = a;
          }
          get position() {
            return this.hb.position;
          }
          set position(a) {
            this.hb.position = a;
          }
        }, Kb = class {
          static {
            __name(this, "Kb");
          }
          La = {};
          Ma = {};
          bb = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.Xa = a.Xa;
            this.id = Fb++;
            this.name = b;
            this.mode = c;
            this.rdev = d;
            this.atime = this.mtime = this.ctime = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S(a, b = {}) {
          if (!a) throw new N(44);
          b.pb ?? (b.pb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a: for (; 40 > c; c++) {
            a = a.split("/").filter((q) => !!q);
            for (var d = Cb, e = "/", g = 0; g < a.length; g++) {
              var h = g === a.length - 1;
              if (h && b.parent) break;
              if ("." !== a[g]) if (".." === a[g]) if (e = bb(e), d === d.parent) {
                a = e + "/" + a.slice(g + 1).join("/");
                c--;
                continue a;
              } else d = d.parent;
              else {
                e = ia(e + "/" + a[g]);
                try {
                  d = Q(d, a[g]);
                } catch (q) {
                  if (44 === q?.Pa && h && b.Wb) return { path: e };
                  throw q;
                }
                !d.bb || h && !b.pb || (d = d.bb.root);
                if (40960 === (d.mode & 61440) && (!h || b.ab)) {
                  if (!d.La.readlink) throw new N(52);
                  d = d.La.readlink(d);
                  "/" === d.charAt(0) || (d = bb(e) + "/" + d);
                  a = d + "/" + a.slice(g + 1).join("/");
                  continue a;
                }
              }
            }
            return { path: e, node: d };
          }
          throw new N(32);
        }
        __name(S, "S");
        function ha(a) {
          for (var b; ; ) {
            if (a === a.parent) return a = a.Xa.Db, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        __name(ha, "ha");
        function Lb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++) c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R.length;
        }
        __name(Lb, "Lb");
        function Ab(a) {
          var b = Lb(a.parent.id, a.name);
          if (R[b] === a) R[b] = a.cb;
          else for (b = R[b]; b; ) {
            if (b.cb === a) {
              b.cb = a.cb;
              break;
            }
            b = b.cb;
          }
        }
        __name(Ab, "Ab");
        function Q(a, b) {
          var c = P(a.mode) ? (c = Mb(a, "x")) ? c : a.La.lookup ? 0 : 2 : 54;
          if (c) throw new N(c);
          for (c = R[Lb(a.id, b)]; c; c = c.cb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
          }
          return a.La.lookup(a, b);
        }
        __name(Q, "Q");
        function zb(a, b, c, d) {
          a = new Kb(a, b, c, d);
          b = Lb(a.parent.id, a.name);
          a.cb = R[b];
          return R[b] = a;
        }
        __name(zb, "zb");
        function P(a) {
          return 16384 === (a & 61440);
        }
        __name(P, "P");
        function Nb(a) {
          var b = ["r", "w", "rw"][a & 3];
          a & 512 && (b += "w");
          return b;
        }
        __name(Nb, "Nb");
        function Mb(a, b) {
          if (Hb) return 0;
          if (!b.includes("r") || a.mode & 292) {
            if (b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73)) return 2;
          } else return 2;
          return 0;
        }
        __name(Mb, "Mb");
        function Ob(a, b) {
          if (!P(a.mode)) return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Mb(a, "wx");
        }
        __name(Ob, "Ob");
        function Pb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Mb(a, "wx")) return a;
          if (c) {
            if (!P(d.mode)) return 54;
            if (d === d.parent || "/" === ha(d)) return 10;
          } else if (P(d.mode)) return 31;
          return 0;
        }
        __name(Pb, "Pb");
        function Qb(a) {
          if (!a) throw new N(63);
          return a;
        }
        __name(Qb, "Qb");
        function T(a) {
          a = Eb[a];
          if (!a) throw new N(8);
          return a;
        }
        __name(T, "T");
        function Rb(a, b = -1) {
          a = Object.assign(new Jb(), a);
          if (-1 == b) a: {
            for (b = 0; 4096 >= b; b++) if (!Eb[b]) break a;
            throw new N(33);
          }
          a.fd = b;
          return Eb[b] = a;
        }
        __name(Rb, "Rb");
        function Sb(a, b = -1) {
          a = Rb(a, b);
          a.Ma?.ec?.(a);
          return a;
        }
        __name(Sb, "Sb");
        function Tb(a, b, c) {
          var d = a?.Ma.Ua;
          a = d ? a : b;
          d ??= b.La.Ua;
          Qb(d);
          d(a, c);
        }
        __name(Tb, "Tb");
        var yb = { open(a) {
          a.Ma = Db[a.node.rdev].Ma;
          a.Ma.open?.(a);
        }, Va() {
          throw new N(70);
        } };
        function mb(a, b) {
          Db[a] = { Ma: b };
        }
        __name(mb, "mb");
        function Ub(a, b) {
          var c = "/" === b;
          if (c && Cb) throw new N(10);
          if (!c && b) {
            var d = S(b, { pb: false });
            b = d.path;
            d = d.node;
            if (d.bb) throw new N(10);
            if (!P(d.mode)) throw new N(54);
          }
          b = { type: a, kc: {}, Db: b, Vb: [] };
          a = a.Xa(b);
          a.Xa = b;
          b.root = a;
          c ? Cb = a : d && (d.bb = b, d.Xa && d.Xa.Vb.push(b));
        }
        __name(Ub, "Ub");
        function Vb(a, b, c) {
          var d = S(a, { parent: true }).node;
          a = cb(a);
          if (!a) throw new N(28);
          if ("." === a || ".." === a) throw new N(20);
          var e = Ob(d, a);
          if (e) throw new N(e);
          if (!d.La.ib) throw new N(63);
          return d.La.ib(d, a, b, c);
        }
        __name(Vb, "Vb");
        function ka(a, b = 438) {
          return Vb(a, b & 4095 | 32768, 0);
        }
        __name(ka, "ka");
        function U(a, b = 511) {
          return Vb(a, b & 1023 | 16384, 0);
        }
        __name(U, "U");
        function Wb(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Vb(a, b | 8192, c);
        }
        __name(Wb, "Wb");
        function Xb(a, b) {
          if (!fb(a)) throw new N(44);
          var c = S(b, { parent: true }).node;
          if (!c) throw new N(44);
          b = cb(b);
          var d = Ob(c, b);
          if (d) throw new N(d);
          if (!c.La.symlink) throw new N(63);
          c.La.symlink(c, b, a);
        }
        __name(Xb, "Xb");
        function Yb(a) {
          var b = S(a, { parent: true }).node;
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, true);
          if (d) throw new N(d);
          if (!b.La.rmdir) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.rmdir(b, a);
          Ab(c);
        }
        __name(Yb, "Yb");
        function ua(a) {
          var b = S(a, { parent: true }).node;
          if (!b) throw new N(44);
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, false);
          if (d) throw new N(d);
          if (!b.La.unlink) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.unlink(b, a);
          Ab(c);
        }
        __name(ua, "ua");
        function Zb(a, b) {
          a = S(a, { ab: !b }).node;
          return Qb(a.La.Ta)(a);
        }
        __name(Zb, "Zb");
        function $b(a, b, c, d) {
          Tb(a, b, { mode: c & 4095 | b.mode & -4096, ctime: Date.now(), Lb: d });
        }
        __name($b, "$b");
        function ma(a, b) {
          a = "string" == typeof a ? S(a, { ab: true }).node : a;
          $b(null, a, b);
        }
        __name(ma, "ma");
        function ac(a, b, c) {
          if (P(b.mode)) throw new N(31);
          if (32768 !== (b.mode & 61440)) throw new N(28);
          var d = Mb(b, "w");
          if (d) throw new N(d);
          Tb(a, b, { size: c, timestamp: Date.now() });
        }
        __name(ac, "ac");
        function na(a, b, c = 438) {
          if ("" === a) throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a) d = a;
          else {
            var e = a.endsWith("/");
            a = S(a, { ab: !(b & 131072), Wb: true });
            d = a.node;
            a = a.path;
          }
          var g = false;
          if (b & 64) if (d) {
            if (b & 128) throw new N(20);
          } else {
            if (e) throw new N(31);
            d = Vb(a, c | 511, 0);
            g = true;
          }
          if (!d) throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode)) throw new N(54);
          if (!g && (e = d ? 40960 === (d.mode & 61440) ? 32 : P(d.mode) && ("r" !== Nb(b) || b & 576) ? 31 : Mb(d, Nb(b)) : 44)) throw new N(e);
          b & 512 && !g && (e = d, e = "string" == typeof e ? S(e, { ab: true }).node : e, ac(null, e, 0));
          b &= -131713;
          e = Rb({ node: d, path: ha(d), flags: b, seekable: true, position: 0, Ma: d.Ma, Yb: [], error: false });
          e.Ma.open && e.Ma.open(e);
          g && ma(d, c & 511);
          !k.logReadFiles || b & 1 || a in Ib || (Ib[a] = 1);
          return e;
        }
        __name(na, "na");
        function pa(a) {
          if (null === a.fd) throw new N(8);
          a.rb && (a.rb = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Eb[a.fd] = null;
          }
          a.fd = null;
        }
        __name(pa, "pa");
        function bc(a, b, c) {
          if (null === a.fd) throw new N(8);
          if (!a.seekable || !a.Ma.Va) throw new N(70);
          if (0 != c && 1 != c && 2 != c) throw new N(28);
          a.position = a.Ma.Va(a, b, c);
          a.Yb = [];
        }
        __name(bc, "bc");
        function cc(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (1 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.read) throw new N(28);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          g || (a.position += b);
          return b;
        }
        __name(cc, "cc");
        function oa(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (0 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.write) throw new N(28);
          a.seekable && a.flags & 1024 && bc(a, 0, 2);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          g || (a.position += b);
          return b;
        }
        __name(oa, "oa");
        function ta(a) {
          var b = b || 0;
          var c = "binary";
          "utf8" !== c && "binary" !== c && Na(`Invalid encoding type "${c}"`);
          b = na(a, b);
          a = Zb(a).size;
          var d = new Uint8Array(a);
          cc(b, d, 0, a, 0);
          "utf8" === c && (d = gb(d));
          pa(b);
          return d;
        }
        __name(ta, "ta");
        function W(a, b, c) {
          a = ia("/dev/" + a);
          var d = ja(!!b, !!c);
          W.Cb ?? (W.Cb = 64);
          var e = W.Cb++ << 8 | 0;
          mb(e, { open(g) {
            g.seekable = false;
          }, close() {
            c?.buffer?.length && c(10);
          }, read(g, h, q, v) {
            for (var u = 0, x = 0; x < v; x++) {
              try {
                var D = b();
              } catch (pb) {
                throw new N(29);
              }
              if (void 0 === D && 0 === u) throw new N(6);
              if (null === D || void 0 === D) break;
              u++;
              h[q + x] = D;
            }
            u && (g.node.atime = Date.now());
            return u;
          }, write(g, h, q, v) {
            for (var u = 0; u < v; u++) try {
              c(h[q + u]);
            } catch (x) {
              throw new N(29);
            }
            v && (g.node.mtime = g.node.ctime = Date.now());
            return u;
          } });
          Wb(a, d, e);
        }
        __name(W, "W");
        var X = {};
        function Y(a, b, c) {
          if ("/" === b.charAt(0)) return b;
          a = -100 === a ? "/" : T(a).path;
          if (0 == b.length) {
            if (!c) throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        __name(Y, "Y");
        function mc(a, b) {
          F[a >> 2] = b.dev;
          F[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.nlink;
          F[a + 12 >> 2] = b.uid;
          F[a + 16 >> 2] = b.gid;
          F[a + 20 >> 2] = b.rdev;
          H[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.blocks;
          var c = b.atime.getTime(), d = b.mtime.getTime(), e = b.ctime.getTime();
          H[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          H[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          H[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          H[a + 88 >> 3] = BigInt(b.ino);
          return 0;
        }
        __name(mc, "mc");
        var Ec = void 0, Gc = /* @__PURE__ */ __name(() => {
          var a = E[+Ec >> 2];
          Ec += 4;
          return a;
        }, "Gc"), Hc = 0, Ic = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Jc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Kc = {}, Lc = /* @__PURE__ */ __name((a) => {
          Ha = a;
          Ya || 0 < Hc || (k.onExit?.(a), Ga = true);
          ya(a, new Sa(a));
        }, "Lc"), Mc = /* @__PURE__ */ __name((a) => {
          if (!Ga) try {
            a();
          } catch (b) {
            b instanceof Sa || "unwind" == b || ya(1, b);
          } finally {
            if (!(Ya || 0 < Hc)) try {
              Ha = a = Ha, Lc(a);
            } catch (b) {
              b instanceof Sa || "unwind" == b || ya(1, b);
            }
          }
        }, "Mc"), Nc = {}, Pc = /* @__PURE__ */ __name(() => {
          if (!Oc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: xa || "./this.program" }, b;
            for (b in Nc) void 0 === Nc[b] ? delete a[b] : a[b] = Nc[b];
            var c = [];
            for (b in a) c.push(`${b}=${a[b]}`);
            Oc = c;
          }
          return Oc;
        }, "Pc"), Oc, Qc = /* @__PURE__ */ __name((a, b, c, d) => {
          var e = { string: /* @__PURE__ */ __name((u) => {
            var x = 0;
            if (null !== u && void 0 !== u && 0 !== u) {
              x = ib(u) + 1;
              var D = y(x);
              M(u, C, D, x);
              x = D;
            }
            return x;
          }, "string"), array: /* @__PURE__ */ __name((u) => {
            var x = y(u.length);
            m.set(u, x);
            return x;
          }, "array") };
          a = k["_" + a];
          var g = [], h = 0;
          if (d) for (var q = 0; q < d.length; q++) {
            var v = e[c[q]];
            v ? (0 === h && (h = qa()), g[q] = v(d[q])) : g[q] = d[q];
          }
          c = a(...g);
          return c = (function(u) {
            0 !== h && sa(h);
            return "string" === b ? z(u) : "boolean" === b ? !!u : u;
          })(c);
        }, "Qc"), fa = /* @__PURE__ */ __name((a) => {
          var b = ib(a) + 1, c = da(b);
          c && M(a, C, c, b);
          return c;
        }, "fa"), Rc, Sc = [], A = /* @__PURE__ */ __name((a) => {
          Rc.delete(Z.get(a));
          Z.set(a, null);
          Sc.push(a);
        }, "A"), Tc = /* @__PURE__ */ __name((a) => {
          const b = a.length;
          return [b % 128 | 128, b >> 7, ...a];
        }, "Tc"), Uc = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, Vc = /* @__PURE__ */ __name((a) => Tc(Array.from(a, (b) => Uc[b])), "Vc"), wa = /* @__PURE__ */ __name((a, b) => {
          if (!Rc) {
            Rc = /* @__PURE__ */ new WeakMap();
            var c = Z.length;
            if (Rc) for (var d = 0; d < 0 + c; d++) {
              var e = Z.get(d);
              e && Rc.set(e, d);
            }
          }
          if (c = Rc.get(a) || 0) return c;
          c = Sc.length ? Sc.pop() : Z.grow(1);
          try {
            Z.set(c, a);
          } catch (g) {
            if (!(g instanceof TypeError)) throw g;
            b = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...Tc([1, 96, ...Vc(b.slice(1)), ...Vc("v" === b[0] ? "" : b[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            b = new WebAssembly.Module(b);
            b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            Z.set(c, b);
          }
          Rc.set(a, c);
          return c;
        }, "wa");
        R = Array(4096);
        Ub(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          mb(259, { read: /* @__PURE__ */ __name(() => 0, "read"), write: /* @__PURE__ */ __name((d, e, g, h) => h, "write"), Va: /* @__PURE__ */ __name(() => 0, "Va") });
          Wb("/dev/null", 259);
          kb(1280, wb);
          kb(1536, xb);
          Wb("/dev/tty", 1280);
          Wb("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = /* @__PURE__ */ __name(() => {
            0 === b && (eb(a), b = a.byteLength);
            return a[--b];
          }, "c");
          W("random", c);
          W("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Ub({ Xa() {
            var b = zb(a, "fd", 16895, 73);
            b.Ma = { Va: O.Ma.Va };
            b.La = { lookup(c, d) {
              c = +d;
              var e = T(c);
              c = { parent: null, Xa: { Db: "fake" }, La: { readlink: /* @__PURE__ */ __name(() => e.path, "readlink") }, id: c + 1 };
              return c.parent = c;
            }, readdir() {
              return Array.from(Eb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        k.noExitRuntime && (Ya = k.noExitRuntime);
        k.print && (Ea = k.print);
        k.printErr && (B = k.printErr);
        k.wasmBinary && (Fa = k.wasmBinary);
        k.thisProgram && (xa = k.thisProgram);
        if (k.preInit) for ("function" == typeof k.preInit && (k.preInit = [k.preInit]); 0 < k.preInit.length; ) k.preInit.shift()();
        k.stackSave = () => qa();
        k.stackRestore = (a) => sa(a);
        k.stackAlloc = (a) => y(a);
        k.cwrap = (a, b, c, d) => {
          var e = !c || c.every((g) => "number" === g || "boolean" === g);
          return "string" !== b && e && !d ? k["_" + a] : (...g) => Qc(a, b, c, g);
        };
        k.addFunction = wa;
        k.removeFunction = A;
        k.UTF8ToString = z;
        k.stringToNewUTF8 = fa;
        k.writeArrayToMemory = (a, b) => {
          m.set(a, b);
        };
        var da, ea, Bb, Wc, sa, y, qa, Ma, Z, Xc = {
          a: /* @__PURE__ */ __name((a, b, c, d) => Na(`Assertion failed: ${z(a)}, at: ` + [b ? z(b) : "unknown filename", c, d ? z(d) : "unknown function"]), "a"),
          i: /* @__PURE__ */ __name(function(a, b) {
            try {
              return a = z(a), ma(a, b), 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          }, "i"),
          L: /* @__PURE__ */ __name(function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c & -8) return -28;
              var d = S(b, { ab: true }).node;
              if (!d) return -44;
              a = "";
              c & 4 && (a += "r");
              c & 2 && (a += "w");
              c & 1 && (a += "x");
              return a && Mb(d, a) ? -2 : 0;
            } catch (e) {
              if ("undefined" == typeof X || "ErrnoError" !== e.name) throw e;
              return -e.Pa;
            }
          }, "L"),
          j: /* @__PURE__ */ __name(function(a, b) {
            try {
              var c = T(a);
              $b(c, c.node, b, false);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          }, "j"),
          h: /* @__PURE__ */ __name(function(a) {
            try {
              var b = T(a);
              Tb(b, b.node, { timestamp: Date.now(), Lb: false });
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          }, "h"),
          b: /* @__PURE__ */ __name(function(a, b, c) {
            Ec = c;
            try {
              var d = T(a);
              switch (b) {
                case 0:
                  var e = Gc();
                  if (0 > e) break;
                  for (; Eb[e]; ) e++;
                  return Sb(d, e).fd;
                case 1:
                case 2:
                  return 0;
                case 3:
                  return d.flags;
                case 4:
                  return e = Gc(), d.flags |= e, 0;
                case 12:
                  return e = Gc(), Ia[e + 0 >> 1] = 2, 0;
                case 13:
                case 14:
                  return 0;
              }
              return -28;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          }, "b"),
          g: /* @__PURE__ */ __name(function(a, b) {
            try {
              var c = T(a), d = c.node, e = c.Ma.Ta;
              a = e ? c : d;
              e ??= d.La.Ta;
              Qb(e);
              var g = e(a);
              return mc(b, g);
            } catch (h) {
              if ("undefined" == typeof X || "ErrnoError" !== h.name) throw h;
              return -h.Pa;
            }
          }, "g"),
          H: /* @__PURE__ */ __name(function(a, b) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return -61;
              var c = T(a);
              if (0 > b || 0 === (c.flags & 2097155)) throw new N(28);
              ac(c, c.node, b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          }, "H"),
          G: /* @__PURE__ */ __name(function(a, b) {
            try {
              if (0 === b) return -28;
              var c = ib("/") + 1;
              if (b < c) return -68;
              M("/", C, a, b);
              return c;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          }, "G"),
          K: /* @__PURE__ */ __name(function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a, true));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          }, "K"),
          C: /* @__PURE__ */ __name(function(a, b, c) {
            try {
              return b = z(b), b = Y(a, b), U(b, c), 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          }, "C"),
          J: /* @__PURE__ */ __name(function(a, b, c, d) {
            try {
              b = z(b);
              var e = d & 256;
              b = Y(a, b, d & 4096);
              return mc(c, e ? Zb(b, true) : Zb(b));
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          }, "J"),
          x: /* @__PURE__ */ __name(function(a, b, c, d) {
            Ec = d;
            try {
              b = z(b);
              b = Y(a, b);
              var e = d ? Gc() : 0;
              return na(b, c, e).fd;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          }, "x"),
          v: /* @__PURE__ */ __name(function(a, b, c, d) {
            try {
              b = z(b);
              b = Y(a, b);
              if (0 >= d) return -28;
              var e = S(b).node;
              if (!e) throw new N(44);
              if (!e.La.readlink) throw new N(28);
              var g = e.La.readlink(e);
              var h = Math.min(d, ib(g)), q = m[c + h];
              M(
                g,
                C,
                c,
                d + 1
              );
              m[c + h] = q;
              return h;
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          }, "v"),
          u: /* @__PURE__ */ __name(function(a) {
            try {
              return a = z(a), Yb(a), 0;
            } catch (b) {
              if ("undefined" == typeof X || "ErrnoError" !== b.name) throw b;
              return -b.Pa;
            }
          }, "u"),
          f: /* @__PURE__ */ __name(function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          }, "f"),
          r: /* @__PURE__ */ __name(function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c) if (512 === c) Yb(b);
              else return -28;
              else ua(b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          }, "r"),
          q: /* @__PURE__ */ __name(function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b, true);
              var d = Date.now(), e, g;
              if (c) {
                var h = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
                1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * h + q / 1e6;
                c += 16;
                h = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
                q = E[c + 8 >> 2];
                1073741823 == q ? g = d : 1073741822 == q ? g = null : g = 1e3 * h + q / 1e6;
              } else g = e = d;
              if (null !== (g ?? e)) {
                a = e;
                var v = S(b, { ab: true }).node;
                Qb(v.La.Ua)(v, { atime: a, mtime: g });
              }
              return 0;
            } catch (u) {
              if ("undefined" == typeof X || "ErrnoError" !== u.name) throw u;
              return -u.Pa;
            }
          }, "q"),
          m: /* @__PURE__ */ __name(() => Na(""), "m"),
          l: /* @__PURE__ */ __name(() => {
            Ya = false;
            Hc = 0;
          }, "l"),
          A: /* @__PURE__ */ __name(function(a, b) {
            a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
            a = new Date(1e3 * a);
            E[b >> 2] = a.getSeconds();
            E[b + 4 >> 2] = a.getMinutes();
            E[b + 8 >> 2] = a.getHours();
            E[b + 12 >> 2] = a.getDate();
            E[b + 16 >> 2] = a.getMonth();
            E[b + 20 >> 2] = a.getFullYear() - 1900;
            E[b + 24 >> 2] = a.getDay();
            var c = a.getFullYear();
            E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Jc : Ic)[a.getMonth()] + a.getDate() - 1 | 0;
            E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
            c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
            var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
            E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
          }, "A"),
          y: /* @__PURE__ */ __name(function(a, b, c, d, e, g, h) {
            e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
            try {
              var q = T(d);
              if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155)) throw new N(2);
              if (1 === (q.flags & 2097155)) throw new N(2);
              if (!q.Ma.jb) throw new N(43);
              if (!a) throw new N(28);
              var v = q.Ma.jb(q, a, e, b, c);
              var u = v.Xb;
              E[g >> 2] = v.Eb;
              F[h >> 2] = u;
              return 0;
            } catch (x) {
              if ("undefined" == typeof X || "ErrnoError" !== x.name) throw x;
              return -x.Pa;
            }
          }, "y"),
          z: /* @__PURE__ */ __name(function(a, b, c, d, e, g) {
            g = -9007199254740992 > g || 9007199254740992 < g ? NaN : Number(g);
            try {
              var h = T(e);
              if (c & 2) {
                c = g;
                if (32768 !== (h.node.mode & 61440)) throw new N(43);
                if (!(d & 2)) {
                  var q = C.slice(a, a + b);
                  h.Ma.kb && h.Ma.kb(h, q, c, b, d);
                }
              }
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          }, "z"),
          n: /* @__PURE__ */ __name((a, b) => {
            Kc[a] && (clearTimeout(Kc[a].id), delete Kc[a]);
            if (!b) return 0;
            var c = setTimeout(() => {
              delete Kc[a];
              Mc(() => Wc(a, performance.now()));
            }, b);
            Kc[a] = { id: c, lc: b };
            return 0;
          }, "n"),
          B: /* @__PURE__ */ __name((a, b, c, d) => {
            var e = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            F[a >> 2] = 60 * Math.max(g, e);
            E[b >> 2] = Number(g != e);
            b = /* @__PURE__ */ __name((h) => {
              var q = Math.abs(h);
              return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
            }, "b");
            a = b(g);
            b = b(e);
            e < g ? (M(a, C, c, 17), M(b, C, d, 17)) : (M(a, C, d, 17), M(b, C, c, 17));
          }, "B"),
          d: /* @__PURE__ */ __name(() => Date.now(), "d"),
          s: /* @__PURE__ */ __name(() => 2147483648, "s"),
          c: /* @__PURE__ */ __name(() => performance.now(), "c"),
          o: /* @__PURE__ */ __name((a) => {
            var b = C.length;
            a >>>= 0;
            if (2147483648 < a) return false;
            for (var c = 1; 4 >= c; c *= 2) {
              var d = b * (1 + 0.2 / c);
              d = Math.min(d, a + 100663296);
              a: {
                d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                  a,
                  d
                ) / 65536)) - Ma.buffer.byteLength + 65535) / 65536 | 0;
                try {
                  Ma.grow(d);
                  La();
                  var e = 1;
                  break a;
                } catch (g) {
                }
                e = void 0;
              }
              if (e) return true;
            }
            return false;
          }, "o"),
          E: /* @__PURE__ */ __name((a, b) => {
            var c = 0, d = 0, e;
            for (e of Pc()) {
              var g = b + c;
              F[a + d >> 2] = g;
              c += M(e, C, g, Infinity) + 1;
              d += 4;
            }
            return 0;
          }, "E"),
          F: /* @__PURE__ */ __name((a, b) => {
            var c = Pc();
            F[a >> 2] = c.length;
            a = 0;
            for (var d of c) a += ib(d) + 1;
            F[b >> 2] = a;
            return 0;
          }, "F"),
          e: /* @__PURE__ */ __name(function(a) {
            try {
              var b = T(a);
              pa(b);
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          }, "e"),
          p: /* @__PURE__ */ __name(function(a, b) {
            try {
              var c = T(a);
              m[b] = c.tty ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
              Ia[b + 2 >> 1] = 0;
              H[b + 8 >> 3] = BigInt(0);
              H[b + 16 >> 3] = BigInt(0);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return d.Pa;
            }
          }, "p"),
          w: /* @__PURE__ */ __name(function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = cc(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          }, "w"),
          D: /* @__PURE__ */ __name(function(a, b, c, d) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return 61;
              var e = T(a);
              bc(e, b, c);
              H[d >> 3] = BigInt(e.position);
              e.rb && 0 === b && 0 === c && (e.rb = null);
              return 0;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return g.Pa;
            }
          }, "D"),
          I: /* @__PURE__ */ __name(function(a) {
            try {
              var b = T(a);
              return b.Ma?.fsync?.(b);
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          }, "I"),
          t: /* @__PURE__ */ __name(function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = oa(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          }, "t"),
          k: Lc
        };
        function Yc() {
          function a() {
            k.calledRun = true;
            if (!Ga) {
              if (!k.noFSInit && !Gb) {
                var b, c;
                Gb = true;
                b ??= k.stdin;
                c ??= k.stdout;
                d ??= k.stderr;
                b ? W("stdin", b) : Xb("/dev/tty", "/dev/stdin");
                c ? W("stdout", null, c) : Xb("/dev/tty", "/dev/stdout");
                d ? W("stderr", null, d) : Xb("/dev/tty1", "/dev/stderr");
                na("/dev/stdin", 0);
                na("/dev/stdout", 1);
                na("/dev/stderr", 1);
              }
              Zc.N();
              Hb = false;
              k.onRuntimeInitialized?.();
              if (k.postRun) for ("function" == typeof k.postRun && (k.postRun = [k.postRun]); k.postRun.length; ) {
                var d = k.postRun.shift();
                Ua.push(d);
              }
              Ta(Ua);
            }
          }
          __name(a, "a");
          if (0 < K) Xa = Yc;
          else {
            if (k.preRun) for ("function" == typeof k.preRun && (k.preRun = [k.preRun]); k.preRun.length; ) Wa();
            Ta(Va);
            0 < K ? Xa = Yc : k.setStatus ? (k.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => k.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        __name(Yc, "Yc");
        var Zc;
        (async function() {
          function a(c) {
            c = Zc = c.exports;
            k._sqlite3_free = c.P;
            k._sqlite3_value_text = c.Q;
            k._sqlite3_prepare_v2 = c.R;
            k._sqlite3_step = c.S;
            k._sqlite3_reset = c.T;
            k._sqlite3_exec = c.U;
            k._sqlite3_finalize = c.V;
            k._sqlite3_column_name = c.W;
            k._sqlite3_column_text = c.X;
            k._sqlite3_column_type = c.Y;
            k._sqlite3_errmsg = c.Z;
            k._sqlite3_clear_bindings = c._;
            k._sqlite3_value_blob = c.$;
            k._sqlite3_value_bytes = c.aa;
            k._sqlite3_value_double = c.ba;
            k._sqlite3_value_int = c.ca;
            k._sqlite3_value_type = c.da;
            k._sqlite3_result_blob = c.ea;
            k._sqlite3_result_double = c.fa;
            k._sqlite3_result_error = c.ga;
            k._sqlite3_result_int = c.ha;
            k._sqlite3_result_int64 = c.ia;
            k._sqlite3_result_null = c.ja;
            k._sqlite3_result_text = c.ka;
            k._sqlite3_aggregate_context = c.la;
            k._sqlite3_column_count = c.ma;
            k._sqlite3_data_count = c.na;
            k._sqlite3_column_blob = c.oa;
            k._sqlite3_column_bytes = c.pa;
            k._sqlite3_column_double = c.qa;
            k._sqlite3_bind_blob = c.ra;
            k._sqlite3_bind_double = c.sa;
            k._sqlite3_bind_int = c.ta;
            k._sqlite3_bind_text = c.ua;
            k._sqlite3_bind_parameter_index = c.va;
            k._sqlite3_sql = c.wa;
            k._sqlite3_normalized_sql = c.xa;
            k._sqlite3_changes = c.ya;
            k._sqlite3_close_v2 = c.za;
            k._sqlite3_create_function_v2 = c.Aa;
            k._sqlite3_update_hook = c.Ba;
            k._sqlite3_open = c.Ca;
            da = k._malloc = c.Da;
            ea = k._free = c.Ea;
            k._RegisterExtensionFunctions = c.Fa;
            Bb = c.Ga;
            Wc = c.Ha;
            sa = c.Ia;
            y = c.Ja;
            qa = c.Ka;
            Ma = c.M;
            Z = c.O;
            La();
            K--;
            k.monitorRunDependencies?.(K);
            0 == K && Xa && (c = Xa, Xa = null, c());
            return Zc;
          }
          __name(a, "a");
          K++;
          k.monitorRunDependencies?.(K);
          var b = { a: Xc };
          if (k.instantiateWasm) return new Promise((c) => {
            k.instantiateWasm(b, (d, e) => {
              c(a(d, e));
            });
          });
          Oa ??= k.locateFile ? k.locateFile("sql-wasm.wasm", Aa) : Aa + "sql-wasm.wasm";
          return a((await Ra(b)).instance);
        })();
        Yc();
        return Module;
      });
      return initSqlJsPromise;
    }, "initSqlJs");
    if (typeof exports === "object" && typeof module === "object") {
      module.exports = initSqlJs2;
      module.exports.default = initSqlJs2;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs2;
      });
    } else if (typeof exports === "object") {
      exports["Module"] = initSqlJs2;
    }
  }
});

// src/portal.js
var import_sql_wasm = __toESM(require_sql_wasm(), 1);
import wasm from "./53dcfce115289105969279ade4ac708d4851a9f4-sql-wasm.wasm";

// src/lib/schema.js
var TABLES = {
  admins: { pk: ["id"], unique: [["username"]], cols: [
    ["id", "INTEGER"],
    ["username", "TEXT", { nn: 1 }],
    ["name", "TEXT", { nn: 1 }],
    ["email", "TEXT"],
    ["role", "TEXT", { nn: 1 }],
    ["pass", "TEXT", { nn: 1 }],
    ["active", "INTEGER", { nn: 1, def: 1 }],
    ["last_login_at", "TEXT"],
    ["created_at", "TEXT"]
  ] },
  colleges: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["name", "TEXT", { nn: 1 }],
    ["short_name", "TEXT"],
    ["address", "TEXT"],
    ["phone", "TEXT"],
    ["email", "TEXT"],
    ["coordinator", "TEXT"],
    ["lat", "REAL"],
    ["lng", "REAL"],
    ["passcode_hash", "TEXT"],
    ["passcode_sent_at", "TEXT"],
    ["last_login_at", "TEXT"],
    ["active", "INTEGER", { nn: 1, def: 1 }],
    ["created_at", "TEXT"],
    ["lsgi", "TEXT"],
    ["passcode_plain", "TEXT"]
  ] },
  villages: { pk: ["id"], unique: [["name"]], cols: [
    ["id", "INTEGER"],
    ["name", "TEXT", { nn: 1 }],
    ["taluk", "TEXT"],
    ["lat", "REAL"],
    ["lng", "REAL"],
    ["officer_name", "TEXT"],
    ["officer_phone", "TEXT"],
    ["officer_email", "TEXT"],
    ["lsgi", "TEXT"],
    ["office_address", "TEXT"],
    ["office_phone", "TEXT"],
    ["officer_id", "INTEGER", { ref: ["officers", "SET NULL"] }]
  ] },
  officers: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["name", "TEXT", { nn: 1 }],
    ["designation", "TEXT"],
    ["phone", "TEXT"],
    ["email", "TEXT"],
    ["passcode_hash", "TEXT"],
    ["passcode_sent_at", "TEXT"],
    ["last_login_at", "TEXT"],
    ["active", "INTEGER", { nn: 1, def: 1 }],
    ["created_at", "TEXT"]
  ] },
  intern_colleges: { pk: ["admin_id", "college_id"], cols: [["admin_id", "INTEGER", { nn: 1, ref: ["admins", "CASCADE"] }], ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }]] },
  intern_villages: { pk: ["admin_id", "village_id"], cols: [["admin_id", "INTEGER", { nn: 1, ref: ["admins", "CASCADE"] }], ["village_id", "INTEGER", { nn: 1, ref: ["villages", "CASCADE"] }]] },
  // a village can be held by only ONE college
  assignments: { pk: ["id"], unique: [["village_id"]], cols: [
    ["id", "INTEGER"],
    ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }],
    ["village_id", "INTEGER", { nn: 1, ref: ["villages", "RESTRICT"] }],
    ["ack_status", "TEXT", { nn: 1, def: "'none'" }],
    ["ack_token", "TEXT"],
    ["submitted_at", "TEXT"],
    ["ack_name", "TEXT"],
    ["ack_designation", "TEXT"],
    ["ack_remarks", "TEXT"],
    ["ack_at", "TEXT"],
    ["query_note", "TEXT"],
    ["created_at", "TEXT"],
    ["distance_km", "REAL"],
    ["distance_note", "TEXT"]
  ] },
  change_requests: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }],
    ["assignment_id", "INTEGER", { ref: ["assignments", "SET NULL"] }],
    ["to_village_id", "INTEGER", { nn: 1, ref: ["villages", "CASCADE"] }],
    ["reason", "TEXT"],
    ["status", "TEXT", { nn: 1, def: "'pending'" }],
    ["admin_note", "TEXT"],
    ["decided_by", "TEXT"],
    ["created_at", "TEXT"],
    ["decided_at", "TEXT"]
  ] },
  days: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }],
    ["village_id", "INTEGER", { nn: 1, ref: ["villages", "CASCADE"] }],
    ["date", "TEXT", { nn: 1 }],
    ["notes", "TEXT"],
    ["created_at", "TEXT"]
  ] },
  volunteers: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["day_id", "INTEGER", { nn: 1, ref: ["days", "CASCADE"] }],
    ["slot", "INTEGER", { nn: 1, def: 0 }],
    ["name", "TEXT", { nn: 1, def: "''" }],
    ["contact", "TEXT", { nn: 1, def: "''" }],
    ["attended", "INTEGER"],
    ["addressed", "INTEGER", { nn: 1, def: 0 }],
    ["registered", "INTEGER", { nn: 1, def: 0 }],
    ["verified", "TEXT"],
    ["verified_by", "TEXT"],
    ["verified_at", "TEXT"],
    ["verify_note", "TEXT"]
  ] },
  media: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["day_id", "INTEGER", { nn: 1, ref: ["days", "CASCADE"] }],
    ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }],
    ["drive_id", "TEXT", { nn: 1 }],
    ["name", "TEXT"],
    ["mime", "TEXT"],
    ["size", "INTEGER"],
    ["created_at", "TEXT"]
  ] },
  certificates: { pk: ["college_id"], cols: [["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }], ["number", "TEXT", { nn: 1 }], ["issued_at", "TEXT"], ["issued_by", "TEXT"]] },
  logs: { pk: ["id"], cols: [["id", "INTEGER"], ["ts", "TEXT", { nn: 1 }], ["actor_type", "TEXT", { nn: 1 }], ["actor", "TEXT"], ["role", "TEXT"], ["action", "TEXT", { nn: 1 }], ["detail", "TEXT"], ["ip", "TEXT"]] },
  announcements: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["title", "TEXT", { nn: 1 }],
    ["body", "TEXT"],
    ["audience", "TEXT", { nn: 1, def: "'all'" }],
    ["pinned", "INTEGER", { nn: 1, def: 0 }],
    ["created_by", "TEXT"],
    ["created_at", "TEXT"],
    ["expires_on", "TEXT"]
  ] },
  issues: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["college_id", "INTEGER", { nn: 1, ref: ["colleges", "CASCADE"] }],
    ["category", "TEXT"],
    ["subject", "TEXT", { nn: 1 }],
    ["message", "TEXT"],
    ["status", "TEXT", { nn: 1, def: "'open'" }],
    ["staff_reply", "TEXT"],
    ["replied_by", "TEXT"],
    ["replied_at", "TEXT"],
    ["created_at", "TEXT"],
    ["updated_at", "TEXT"]
  ] },
  resources: { pk: ["id"], cols: [
    ["id", "INTEGER"],
    ["title", "TEXT", { nn: 1 }],
    ["description", "TEXT"],
    ["category", "TEXT"],
    ["audience", "TEXT", { nn: 1, def: "'colleges'" }],
    ["kind", "TEXT", { nn: 1, def: "'file'" }],
    ["url", "TEXT"],
    ["drive_id", "TEXT"],
    ["filename", "TEXT"],
    ["mime", "TEXT"],
    ["size", "INTEGER"],
    ["created_by", "TEXT"],
    ["created_at", "TEXT"]
  ] },
  outbox: { pk: ["id"], cols: [["id", "INTEGER"], ["ts", "TEXT"], ["to_addr", "TEXT"], ["subject", "TEXT"], ["body", "TEXT"], ["status", "TEXT"], ["error", "TEXT"]] }
};
var TABLE_NAMES = Object.keys(TABLES);
var LAZY_TABLES = /* @__PURE__ */ new Set(["logs", "outbox"]);
var colSql = /* @__PURE__ */ __name(([n, t, o = {}]) => `${n} ${t}${o.nn ? " NOT NULL" : ""}${o.def !== void 0 ? ` DEFAULT ${o.def}` : ""}`, "colSql");
function ddl() {
  const out = [];
  for (const [name, t] of Object.entries(TABLES)) {
    const parts = t.cols.map(colSql);
    parts.push(`PRIMARY KEY(${t.pk.join(",")})`);
    for (const u of t.unique || []) parts.push(`UNIQUE(${u.join(",")})`);
    for (const [n, , o = {}] of t.cols) if (o.ref) parts.push(`FOREIGN KEY(${n}) REFERENCES ${o.ref[0]}(id) ON DELETE ${o.ref[1]}`);
    out.push(`CREATE TABLE ${name}(${parts.join(", ")})`);
  }
  out.push("CREATE TABLE _chg(seq INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT, op TEXT, pk TEXT, row TEXT)");
  for (const [name, t] of Object.entries(TABLES)) {
    const arr = /* @__PURE__ */ __name((p) => `json_array(${t.cols.map((c) => `${p}.${c[0]}`).join(",")})`, "arr"), pk = /* @__PURE__ */ __name((p) => `json_array(${t.pk.map((k) => `${p}.${k}`).join(",")})`, "pk");
    out.push(`CREATE TRIGGER ${name}_ti AFTER INSERT ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','i',${pk("NEW")},${arr("NEW")}); END`);
    out.push(`CREATE TRIGGER ${name}_tu AFTER UPDATE ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','u',${pk("NEW")},${arr("NEW")}); END`);
    out.push(`CREATE TRIGGER ${name}_td AFTER DELETE ON ${name} BEGIN INSERT INTO _chg(t,op,pk,row) VALUES('${name}','d',${pk("OLD")},NULL); END`);
  }
  return out;
}
__name(ddl, "ddl");
var sheetSchema = /* @__PURE__ */ __name(() => Object.fromEntries(Object.entries(TABLES).map(([n, t]) => [n, { pk: t.pk, unique: t.unique || [], cols: t.cols.map((c) => [c[0], c[1], c[2]?.nn ? 1 : 0]) }])), "sheetSchema");
var SCHEMA_VER = (() => {
  let h = 5381;
  const t = JSON.stringify(sheetSchema());
  for (let i = 0; i < t.length; i++) h = (h << 5) + h + t.charCodeAt(i) | 0;
  return "v" + (h >>> 0).toString(36);
})();

// src/lib/villages.js
var VILLAGES = [
  ["Kozhikode", "Kozhikode", 11.2588, 75.7804],
  ["Elathur", "Kozhikode", 11.324, 75.748],
  ["Kakkodi", "Kozhikode", 11.33, 75.81],
  ["Kunnamangalam", "Kozhikode", 11.305, 75.877],
  ["Olavanna", "Kozhikode", 11.2, 75.83],
  ["Perumanna", "Kozhikode", 11.215, 75.835],
  ["Feroke", "Kozhikode", 11.185, 75.835],
  ["Beypore", "Kozhikode", 11.17, 75.805],
  ["Cheruvannur", "Kozhikode", 11.2, 75.8],
  ["Nallalam", "Kozhikode", 11.23, 75.8],
  ["Kadalundi", "Kozhikode", 11.13, 75.82],
  ["Madavoor", "Kozhikode", 11.318, 75.892],
  ["Peruvayal", "Kozhikode", 11.24, 75.89],
  ["Chelavoor", "Kozhikode", 11.29, 75.88],
  ["Thalakkulathur", "Kozhikode", 11.355, 75.805],
  ["Chathamangalam", "Kozhikode", 11.235, 75.95],
  ["Kuruvattur", "Kozhikode", 11.3, 75.92],
  ["Pantheerankavu", "Kozhikode", 11.23, 75.84],
  ["Koyilandy", "Koyilandy", 11.435, 75.697],
  ["Panthalayani", "Koyilandy", 11.458, 75.665],
  ["Chemancheri", "Koyilandy", 11.458, 75.73],
  ["Ulliyeri", "Koyilandy", 11.43, 75.78],
  ["Balussery", "Koyilandy", 11.456, 75.83],
  ["Naduvannur", "Koyilandy", 11.445, 75.8],
  ["Arikkulam", "Koyilandy", 11.49, 75.75],
  ["Meppayur", "Koyilandy", 11.53, 75.7],
  ["Thikkodi", "Koyilandy", 11.48, 75.63],
  ["Moodadi", "Koyilandy", 11.47, 75.67],
  ["Perambra", "Koyilandy", 11.57, 75.76],
  ["Kayanna", "Koyilandy", 11.5, 75.8],
  ["Kottur", "Koyilandy", 11.425, 75.755],
  ["Atholi", "Koyilandy", 11.4, 75.78],
  ["Vadakara", "Vadakara", 11.6, 75.59],
  ["Onchiyam", "Vadakara", 11.637, 75.589],
  ["Azhiyur", "Vadakara", 11.64, 75.56],
  ["Edacheri", "Vadakara", 11.61, 75.65],
  ["Villiyappally", "Vadakara", 11.625, 75.65],
  ["Thiruvallur", "Vadakara", 11.62, 75.68],
  ["Maniyur", "Vadakara", 11.61, 75.6],
  ["Nadapuram", "Vadakara", 11.69, 75.69],
  ["Kuttiady", "Vadakara", 11.67, 75.76],
  ["Kavilumpara", "Vadakara", 11.72, 75.8],
  ["Purameri", "Vadakara", 11.63, 75.62],
  ["Chorode", "Vadakara", 11.628, 75.57],
  ["Eramala", "Vadakara", 11.65, 75.6],
  ["Velom", "Vadakara", 11.67, 75.7],
  ["Thamarassery", "Thamarassery", 11.41, 75.93],
  ["Koduvally", "Thamarassery", 11.35, 75.93],
  ["Kattippara", "Thamarassery", 11.43, 75.97],
  ["Puthuppadi", "Thamarassery", 11.5, 76.03],
  ["Koodaranji", "Thamarassery", 11.38, 76.03],
  ["Kodenchery", "Thamarassery", 11.435, 76.02],
  ["Thiruvambadi", "Thamarassery", 11.38, 76],
  ["Omassery", "Thamarassery", 11.34, 76.01],
  ["Karassery", "Thamarassery", 11.285, 75.965],
  ["Mukkam", "Thamarassery", 11.3, 75.99],
  ["Kodiyathur", "Thamarassery", 11.31, 75.98],
  ["Koorachundu", "Thamarassery", 11.54, 75.85]
];

// src/lib/util.js
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
};
var bad = /* @__PURE__ */ __name((m, extra) => new HttpError(400, m, extra), "bad");
var todayStr = /* @__PURE__ */ __name(() => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10), "todayStr");
var nowIso = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "nowIso");
var isDate = /* @__PURE__ */ __name((s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")), "isDate");
var toUtc = /* @__PURE__ */ __name((s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}, "toUtc");
function dateRange(start, end, skipSundays) {
  const out = [];
  const e = toUtc(end);
  for (let d = toUtc(start); d <= e; d = new Date(d.getTime() + 864e5)) {
    if (skipSundays && d.getUTCDay() === 0) continue;
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
__name(dateRange, "dateRange");
function haversine(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || isNaN(v))) return null;
  const R = 6371, rad = /* @__PURE__ */ __name((x) => x * Math.PI / 180, "rad");
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}
__name(haversine, "haversine");
var enc = new TextEncoder();
var toHex = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "toHex");
var fromHex = /* @__PURE__ */ __name((h) => Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16)), "fromHex");
async function pbkdf2(secret, salt, iterations) {
  const key2 = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key2, 256));
}
__name(pbkdf2, "pbkdf2");
async function hashSecret(secret, iterations = 1e5) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(await pbkdf2(secret, salt, iterations))}`;
}
__name(hashSecret, "hashSecret");
async function verifySecret(secret, stored) {
  const [alg, it, salt, hash] = String(stored || "").split("$");
  if (alg !== "pbkdf2" || !hash) return false;
  const got = await pbkdf2(String(secret), fromHex(salt), Number(it)), want = fromHex(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
__name(verifySecret, "verifySecret");
var ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newPasscode() {
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(8))) s += ALPHA[b % ALPHA.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
__name(newPasscode, "newPasscode");
var normPasscode = /* @__PURE__ */ __name((s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), "normPasscode");
var token = /* @__PURE__ */ __name((n = 24) => {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}, "token");
function str(v, max = 200) {
  if (v == null) return "";
  return String(v).trim().slice(0, max);
}
__name(str, "str");
function reqStr(v, label, max = 200) {
  const s = str(v, max);
  if (!s) throw bad(`${label} is required`);
  return s;
}
__name(reqStr, "reqStr");
function int(v, label, { min = 0, max = 1e7 } = {}) {
  const n = Number(v === "" || v == null ? 0 : v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${label} must be a whole number between ${min} and ${max}`);
  return n;
}
__name(int, "int");
function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
__name(num, "num");
function phone(v, label = "Contact number") {
  const s = String(v || "").replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(s)) throw bad(`${label} must be a valid 10-digit mobile number`);
  return s;
}
__name(phone, "phone");
function emailOk(v, label = "Email") {
  const s = str(v, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad(`${label} is not a valid email address`);
  return s;
}
__name(emailOk, "emailOk");
function csv(rows, cols) {
  const cell = /* @__PURE__ */ __name((v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }, "cell");
  return "\uFEFF" + [
    cols.map((c) => cell(c.label)).join(","),
    ...rows.map((r) => cols.map((c) => cell(r[c.key])).join(","))
  ].join("\r\n");
}
__name(csv, "csv");
var isDup = /* @__PURE__ */ __name((e) => !!e && (/UNIQUE constraint failed/i.test(e.message || "") || e.extra?.code === "conflict"), "isDup");

// src/lib/store.js
var SQL = null;
var setEngine = /* @__PURE__ */ __name((s) => {
  SQL = s;
}, "setEngine");
var engine = /* @__PURE__ */ __name(() => {
  if (!SQL) throw new Error("SQL engine not initialised");
  return SQL;
}, "engine");
var STALE_MS = 8e3;
async function callScript(env, payload) {
  if (!env.SCRIPT_URL || !env.SCRIPT_SECRET) throw new HttpError(503, "The Google Sheet database is not connected yet (SCRIPT_URL / SCRIPT_SECRET missing).");
  let r;
  try {
    r = await fetch(env.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ secret: env.SCRIPT_SECRET, ...payload }), redirect: "follow" });
  } catch (e) {
    throw new HttpError(502, "Could not reach the Google Sheet service: " + e.message);
  }
  const text = await r.text();
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'The Google Sheet service returned an unexpected reply (check the Apps Script deployment is "Anyone" access).');
  }
  if (d.error) throw new HttpError(d.conflict ? 409 : 502, d.conflict ? d.error : "Google Sheet: " + d.error, d.conflict ? { code: "conflict" } : {});
  return d;
}
__name(callScript, "callScript");
function coerce(v, type, nn) {
  if (v === "" || v == null) return type === "TEXT" ? nn ? "" : null : null;
  if (type === "TEXT") return String(v);
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
__name(coerce, "coerce");
function buildBytes(tables) {
  const db = new (engine()).Database();
  db.run("PRAGMA foreign_keys=OFF");
  for (const s of ddl().filter((x) => x.startsWith("CREATE TABLE"))) db.run(s);
  db.run("BEGIN");
  for (const name of TABLE_NAMES) {
    const t = TABLES[name], rows = tables[name] || [];
    if (!rows.length) continue;
    const st = db.prepare(`INSERT OR REPLACE INTO ${name}(${t.cols.map((c) => c[0]).join(",")}) VALUES (${t.cols.map(() => "?").join(",")})`);
    for (const r of rows) st.run(t.cols.map((c, i) => coerce(r[i], c[1], c[2]?.nn)));
    st.free();
  }
  db.run("COMMIT");
  for (const s of ddl().filter((x) => x.startsWith("CREATE TRIGGER"))) db.run(s);
  const bytes = db.export();
  db.close();
  return bytes;
}
__name(buildBytes, "buildBytes");
var pad = /* @__PURE__ */ __name((t, row) => row.concat(Array(Math.max(0, TABLES[t].cols.length - row.length)).fill(null)), "pad");
async function fetchFresh(env, since, prepareSheet) {
  if (prepareSheet) await callScript(env, { action: "setup", schema: sheetSchema() });
  const d = await callScript(env, { action: "load", since });
  if (d.same) return { same: true, version: d.version, stamp: d.stamp };
  if (!d.init) {
    await callScript(env, { action: "setup", schema: sheetSchema() });
    const ops = [];
    const t0 = Date.now() * 1e3;
    VILLAGES.forEach((v, i) => ops.push({ t: "villages", op: "i", pk: [t0 + i], row: pad("villages", [t0 + i, v[0], v[1], v[2], v[3]]) }));
    if (env.ADMIN_PASSWORD) {
      const id = t0 + 999;
      ops.push({ t: "admins", op: "i", pk: [id], row: pad("admins", [id, "superadmin", "Super Admin", null, "super_admin", await hashSecret(env.ADMIN_PASSWORD), 1, null, (/* @__PURE__ */ new Date()).toISOString()]) });
    }
    try {
      await callScript(env, { action: "apply", ops });
    } catch (e) {
      if (e.extra?.code !== "conflict") throw e;
    }
    return fetchFresh(env, void 0);
  }
  return { version: d.version, stamp: d.stamp, bytes: buildBytes(d.tables) };
}
__name(fetchFresh, "fetchFresh");
var mem = null;
var backend = null;
var savedBytes = null;
var setBackend = /* @__PURE__ */ __name((b) => {
  backend = b;
}, "setBackend");
async function save(e) {
  e = { ...e, schema: SCHEMA_VER };
  mem = e;
  if (backend) {
    await backend.put(e, e.bytes !== savedBytes);
    savedBytes = e.bytes;
  }
}
__name(save, "save");
async function current() {
  if (!mem && backend) {
    mem = await backend.get();
    savedBytes = mem && mem.bytes;
  }
  if (mem && mem.schema !== SCHEMA_VER) {
    mem = null;
    savedBytes = null;
  }
  return mem;
}
__name(current, "current");
var loading = null;
async function getEntry(env, execCtx) {
  const e = await current();
  if (!e) {
    loading ||= (async () => {
      const f = await fetchFresh(env, void 0, !env.SKIP_SETUP);
      const first = { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
      await save(first);
      return first;
    })().finally(() => {
      loading = null;
    });
    return loading;
  }
  if (Date.now() - e.fetchedAt > STALE_MS) {
    const claimed = { ...e, fetchedAt: Date.now() };
    mem = claimed;
    execCtx.waitUntil((async () => {
      try {
        const f = await fetchFresh(env, e.stamp);
        await putEntry(f.same ? { ...e, fetchedAt: Date.now() } : { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() });
      } catch (err) {
        console.error("background refresh failed", err.message);
      }
    })());
    return claimed;
  }
  return e;
}
__name(getEntry, "getEntry");
async function putEntry(e) {
  if (mem && mem.version > e.version) return;
  await save(e);
}
__name(putEntry, "putEntry");
async function refreshNow(env) {
  const cur = await current();
  if (!cur) {
    await putEntry(await reloadEntry(env));
    return "loaded";
  }
  const f = await fetchFresh(env, cur.stamp);
  if (f.same) {
    await putEntry({ ...cur, fetchedAt: Date.now() });
    return "unchanged";
  }
  await putEntry({ bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() });
  return "updated";
}
__name(refreshNow, "refreshNow");
async function reloadEntry(env) {
  const f = await fetchFresh(env);
  return { bytes: f.bytes, version: f.version, stamp: f.stamp, fetchedAt: Date.now() };
}
__name(reloadEntry, "reloadEntry");

// src/lib/db.js
var lastId = 0;
function newId() {
  let id = Date.now() * 1e3 + Math.floor(Math.random() * 1e3);
  if (id <= lastId) id = lastId + 1;
  return lastId = id;
}
__name(newId, "newId");
var lazyBuf = [];
var harmless = /* @__PURE__ */ new Set();
var flushScheduled = false;
var sleep = /* @__PURE__ */ __name((ms) => new Promise((r) => setTimeout(r, ms)), "sleep");
async function flushLazy(env) {
  flushScheduled = false;
  if (!lazyBuf.length) return;
  const ops = lazyBuf.splice(0);
  try {
    harmless.add((await callScript(env, { action: "apply", ops })).version);
  } catch (e) {
    console.error("background write failed", e.message);
    lazyBuf.push(...ops.filter((o) => o.op === "i" && LAZY_TABLES.has(o.t)));
  }
}
__name(flushLazy, "flushLazy");
var HAS_ID = new Set(Object.entries(TABLES).filter(([, t]) => t.pk.length === 1 && t.pk[0] === "id").map(([n]) => n));
function withId(text, params) {
  const m = text.match(/^\s*INSERT INTO (\w+)\(([^)]*)\)\s*VALUES\s*\(/i);
  if (!m || !HAS_ID.has(m[1]) || /(^|,)\s*id\s*(,|$)/.test(m[2])) return null;
  const id = newId();
  return { id, text: text.replace(/^(\s*INSERT INTO \w+\()/i, "$1id,").replace(/(VALUES\s*\()/i, "$1?,"), params: [id, ...params] };
}
__name(withId, "withId");
var norm = /* @__PURE__ */ __name((p) => p.map((v) => v === void 0 ? null : typeof v === "boolean" ? +v : v), "norm");
function adapter(raw) {
  const all2 = /* @__PURE__ */ __name((text, p) => {
    const st = raw.prepare(text);
    try {
      st.bind(norm(p));
      const rows = [];
      while (st.step()) rows.push(st.getAsObject());
      return rows;
    } finally {
      st.free();
    }
  }, "all");
  const run = /* @__PURE__ */ __name((text, p) => {
    raw.run(text, norm(p));
    return raw.getRowsModified();
  }, "run");
  return {
    all: /* @__PURE__ */ __name(async (text, ...p) => all2(text, p), "all"),
    get: /* @__PURE__ */ __name(async (text, ...p) => all2(text, p)[0], "get"),
    run: /* @__PURE__ */ __name(async (text, ...p) => {
      const w = withId(text, p);
      return { changes: run(w ? w.text : text, w ? w.params : p) };
    }, "run"),
    insert: /* @__PURE__ */ __name(async (text, ...p) => {
      const w = withId(text, p);
      if (!w) throw new Error("insert() needs a table with an id column");
      run(w.text, w.params);
      return w.id;
    }, "insert"),
    tx: /* @__PURE__ */ __name(async (fn) => {
      raw.run("SAVEPOINT tx");
      try {
        const r = await fn(adapter(raw));
        raw.run("RELEASE tx");
        return r;
      } catch (e) {
        raw.run("ROLLBACK TO tx");
        raw.run("RELEASE tx");
        throw e;
      }
    }, "tx")
  };
}
__name(adapter, "adapter");
async function openDb(env, execCtx) {
  const entry = await getEntry(env, execCtx);
  const raw = new (engine()).Database(entry.bytes);
  raw.run("PRAGMA foreign_keys=ON");
  const db = adapter(raw);
  const extra = [];
  db.addExtra = (t, row) => extra.push({ t, op: "i", pk: [row[0]], row });
  db.raw = raw;
  db.finish = async (ok) => {
    const ops = ok ? coalesce(all(raw, "SELECT t,op,pk,row FROM _chg ORDER BY seq", [])) : [];
    const ex = extra.slice();
    const send = [...ops, ...ex];
    if (!send.length) return;
    if (db.lazy || send.every((o) => LAZY_TABLES.has(o.t))) {
      lazyBuf.push(...send);
      if (!flushScheduled) {
        flushScheduled = true;
        execCtx.waitUntil(sleep(1500).then(() => flushLazy(env)));
      }
      return;
    }
    const piggy = [];
    for (let i = lazyBuf.length - 1; i >= 0; i--) if (lazyBuf[i].op === "i" && LAZY_TABLES.has(lazyBuf[i].t)) piggy.unshift(...lazyBuf.splice(i, 1));
    let r;
    try {
      r = await callScript(env, { action: "apply", ops: [...piggy, ...send] });
    } catch (e) {
      lazyBuf.push(...piggy);
      if (e.extra?.code === "conflict") await putEntry(await reloadEntry(env)).catch(() => {
      });
      throw e;
    }
    if (!ok) return;
    for (const e of [...piggy, ...ex]) {
      const t = TABLES[e.t];
      raw.run(`INSERT OR REPLACE INTO ${e.t}(${t.cols.map((c) => c[0]).join(",")}) VALUES (${t.cols.map(() => "?").join(",")})`, norm(e.row));
    }
    raw.run("DELETE FROM _chg");
    let skipped = 0, known = 0;
    for (let v = entry.version + 1; v < r.version; v++) {
      skipped++;
      if (harmless.has(v)) known++;
    }
    if (skipped === known) await putEntry({ bytes: raw.export(), version: r.version, stamp: r.stamp, fetchedAt: Date.now() });
    else await putEntry(await reloadEntry(env));
  };
  db.close = () => {
    try {
      raw.close();
    } catch {
    }
  };
  return db;
}
__name(openDb, "openDb");
function all(raw, text, p) {
  const st = raw.prepare(text);
  try {
    st.bind(p);
    const rows = [];
    while (st.step()) rows.push(st.getAsObject());
    return rows;
  } finally {
    st.free();
  }
}
__name(all, "all");
function coalesce(rows) {
  const m = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key2 = r.t + "|" + r.pk, prev = m.get(key2);
    const pk = JSON.parse(r.pk), row = r.row ? JSON.parse(r.row) : null;
    if (r.op === "d") {
      if (prev && prev.op === "i") m.delete(key2);
      else m.set(key2, { t: r.t, op: "d", pk });
    } else m.set(key2, { t: r.t, op: prev && prev.op === "i" ? "i" : r.op === "i" && prev && prev.op === "d" ? "u" : r.op, pk, row });
  }
  return [...m.values()];
}
__name(coalesce, "coalesce");
async function log(db, actorType, actor, role, action, detail, ip) {
  db.addExtra("logs", [newId(), (/* @__PURE__ */ new Date()).toISOString(), actorType, actor || null, role || null, action, detail || null, ip || null]);
}
__name(log, "log");

// src/lib/session.js
var enc2 = new TextEncoder();
var b64 = /* @__PURE__ */ __name((b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64");
var unb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)), "unb64");
var key = /* @__PURE__ */ __name((env) => crypto.subtle.importKey("raw", enc2.encode("session:" + env.SCRIPT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]), "key");
async function signSession(env, { k, id, v, hours }) {
  const body = b64(enc2.encode(JSON.stringify({ k, id, v, exp: Date.now() + hours * 36e5 })));
  return `${body}.${b64(await crypto.subtle.sign("HMAC", await key(env), enc2.encode(body)))}`;
}
__name(signSession, "signSession");
async function readSession(env, token2) {
  const [body, sig] = String(token2 || "").split(".");
  if (!body || !sig) return null;
  try {
    if (!await crypto.subtle.verify("HMAC", await key(env), unb64(sig), enc2.encode(body))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64(body)));
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
__name(readSession, "readSession");
var fingerprint = /* @__PURE__ */ __name((s) => String(s || "").slice(-12), "fingerprint");

// src/lib/router.js
var routes = [];
function route(method, pattern, guard, handler) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => {
    keys.push(k);
    return "([^/]+)";
  }) + "/?$");
  routes.push({ method, re, keys, guard, handler });
}
__name(route, "route");
var COOKIE = { college: "elc_c", staff: "elc_s" };
function parseCookies(req) {
  const out = {};
  for (const p of (req.headers.get("cookie") || "").split(";")) {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
__name(parseCookies, "parseCookies");
async function sessionUser(ctx, kind) {
  const p = await readSession(ctx.env, parseCookies(ctx.req)[COOKIE[kind]]);
  if (!p || p.k !== kind) return null;
  if (kind === "college") {
    const c = await ctx.db.get("SELECT * FROM colleges WHERE id=? AND active=1", p.id);
    return c && c.passcode_hash && fingerprint(c.passcode_hash) === p.v ? c : null;
  }
  const a = await ctx.db.get("SELECT id,username,name,email,role,active,pass FROM admins WHERE id=?", p.id);
  if (!a || !a.active || fingerprint(a.pass) !== p.v) return null;
  delete a.pass;
  return a;
}
__name(sessionUser, "sessionUser");
async function issueSession(ctx, kind, subject, hours) {
  const v = fingerprint(kind === "college" ? subject.passcode_hash : subject.pass);
  setCookie(ctx, COOKIE[kind], await signSession(ctx.env, { k: kind, id: subject.id, v, hours }), hours * 3600);
}
__name(issueSession, "issueSession");
async function guardCheck(guard, ctx) {
  if (!guard) return;
  if (guard === "college") {
    ctx.college = await sessionUser(ctx, "college");
    if (!ctx.college) throw new HttpError(401, "Please sign in with your college passcode");
    return;
  }
  ctx.user = await sessionUser(ctx, "staff");
  if (!ctx.user) throw new HttpError(401, "Please sign in");
  if (Array.isArray(guard) && !guard.includes(ctx.user.role))
    throw new HttpError(403, "Your role does not have access to this action");
}
__name(guardCheck, "guardCheck");
function setCookie(ctx, name, value, maxAge) {
  ctx.cookies.push(`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${ctx.secure ? "; Secure" : ""}`);
}
__name(setCookie, "setCookie");
async function scopeOf(ctx) {
  if (ctx.user.role !== "intern") return null;
  const [c, v] = await Promise.all([
    ctx.db.all("SELECT college_id id FROM intern_colleges WHERE admin_id=?", ctx.user.id),
    ctx.db.all("SELECT village_id id FROM intern_villages WHERE admin_id=?", ctx.user.id)
  ]);
  return { colleges: new Set(c.map((r) => r.id)), villages: new Set(v.map((r) => r.id)) };
}
__name(scopeOf, "scopeOf");
async function assertCollege(ctx, id) {
  const s = await scopeOf(ctx);
  if (s && !s.colleges.has(Number(id))) throw new HttpError(403, "This college is not assigned to you");
}
__name(assertCollege, "assertCollege");
async function assertVillage(ctx, id) {
  const s = await scopeOf(ctx);
  if (s && !s.villages.has(Number(id))) throw new HttpError(403, "This village is not assigned to you");
}
__name(assertVillage, "assertVillage");

// src/lib/stats.js
var SCORE_FORMULA = { registered: 10, addressed: 2, attended: 5, verifiedVillage: 50 };
async function collegeStats(db) {
  const [colleges, asgR, dysR, volR] = await Promise.all([
    db.all("SELECT id,name,short_name,address FROM colleges WHERE active=1"),
    db.all(`SELECT college_id id, COUNT(*) villages, COALESCE(SUM((ack_status='acknowledged')),0) ack,
      COALESCE(SUM((ack_status='submitted')),0) submitted FROM assignments GROUP BY college_id`),
    db.all(`SELECT d.college_id id, COUNT(*) planned,
      COALESCE(SUM((EXISTS(SELECT 1 FROM volunteers v WHERE v.day_id=d.id AND v.attended=1))),0) done FROM days d GROUP BY d.college_id`),
    db.all(`SELECT d.college_id id,
      COALESCE(SUM((v.attended=1)),0) attended, COALESCE(SUM((v.attended=0)),0) absent,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.addressed END),0) addressed,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.registered END),0) registered,
      COALESCE(SUM(CASE WHEN v.attended=1 AND a.ack_status='acknowledged' THEN v.registered END),0) verified_registered,
      COUNT(DISTINCT CASE WHEN v.name<>'' THEN lower(trim(v.name))||'|'||v.contact END) volunteers
    FROM volunteers v JOIN days d ON d.id=v.day_id
    LEFT JOIN assignments a ON a.college_id=d.college_id AND a.village_id=d.village_id GROUP BY d.college_id`)
  ]);
  const asg = new Map(asgR.map((r) => [r.id, r])), dys = new Map(dysR.map((r) => [r.id, r])), vol = new Map(volR.map((r) => [r.id, r]));
  const rows = colleges.map((c) => {
    const a = asg.get(c.id) || {}, d = dys.get(c.id) || {}, v = vol.get(c.id) || {};
    const attended = v.attended || 0, absent = v.absent || 0;
    const r = {
      id: c.id,
      name: c.name,
      short_name: c.short_name || c.name,
      address: c.address,
      villages: a.villages || 0,
      villages_ack: a.ack || 0,
      villages_submitted: a.submitted || 0,
      days_planned: d.planned || 0,
      days_done: d.done || 0,
      volunteers: v.volunteers || 0,
      vdays_attended: attended,
      vdays_absent: absent,
      attendance_pct: attended + absent ? Math.round(attended * 100 / (attended + absent)) : null,
      addressed: v.addressed || 0,
      registered: v.registered || 0,
      verified_registered: v.verified_registered || 0
    };
    r.score = r.registered * SCORE_FORMULA.registered + r.addressed * SCORE_FORMULA.addressed + r.vdays_attended * SCORE_FORMULA.attended + r.villages_ack * SCORE_FORMULA.verifiedVillage;
    return r;
  });
  rows.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}
__name(collegeStats, "collegeStats");
async function publicBoard(db) {
  const [colleges, totalVillages, villages, trend] = await Promise.all([
    collegeStats(db),
    db.get("SELECT COUNT(*) n FROM villages"),
    db.all(`SELECT v.id, v.name, v.taluk,
      CASE WHEN EXISTS(SELECT 1 FROM assignments a WHERE a.village_id=v.id AND a.ack_status='acknowledged') THEN 'verified'
           WHEN EXISTS(SELECT 1 FROM days d JOIN volunteers x ON x.day_id=d.id WHERE d.village_id=v.id AND x.attended=1) THEN 'active'
           WHEN EXISTS(SELECT 1 FROM assignments a WHERE a.village_id=v.id) THEN 'allotted' ELSE 'open' END status
    FROM villages v ORDER BY v.taluk, v.name`),
    db.all(`SELECT d.date, SUM(v.addressed) addressed, SUM(v.registered) registered
    FROM days d JOIN volunteers v ON v.day_id=d.id WHERE v.attended=1 GROUP BY d.date ORDER BY d.date DESC LIMIT 30`)
  ]);
  trend.reverse();
  const sum = /* @__PURE__ */ __name((k) => colleges.reduce((s, c) => s + c[k], 0), "sum");
  const top = /* @__PURE__ */ __name((key2, filter = () => true) => {
    const c = colleges.filter(filter).sort((a, b) => b[key2] - a[key2])[0];
    return c && c[key2] > 0 ? { id: c.id, name: c.short_name, value: c[key2] } : null;
  }, "top");
  const awards = {
    registrations: top("registered"),
    outreach: top("addressed"),
    volunteers: top("volunteers"),
    verified: top("villages_ack"),
    attendance: top("attendance_pct", (c) => c.vdays_attended + c.vdays_absent >= 4)
  };
  return {
    totals: {
      colleges: colleges.length,
      volunteers: sum("volunteers"),
      days_done: sum("days_done"),
      vdays_attended: sum("vdays_attended"),
      addressed: sum("addressed"),
      registered: sum("registered"),
      verified_registered: sum("verified_registered"),
      villages_total: totalVillages.n,
      villages_active: villages.filter((v) => v.status === "active" || v.status === "verified").length,
      villages_verified: villages.filter((v) => v.status === "verified").length,
      villages_allotted: villages.filter((v) => v.status !== "open").length
    },
    colleges,
    villages,
    trend,
    awards,
    formula: SCORE_FORMULA
  };
}
__name(publicBoard, "publicBoard");

// src/lib/mailer.js
var mailConfigured = /* @__PURE__ */ __name((env) => !!env.RESEND_API_KEY, "mailConfigured");
async function sendMail(db, env, to, subject, body) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const save2 = /* @__PURE__ */ __name((status, error) => db.addExtra("outbox", [newId(), ts, to || "", subject, body, status, error || null]), "save");
  if (!to) {
    save2("failed", "No recipient email on record");
    return { status: "failed", error: "No recipient email on record" };
  }
  if (!env.RESEND_API_KEY) {
    save2("saved");
    return { status: "saved" };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.MAIL_FROM || "ELC Kozhikode <onboarding@resend.dev>", to: [to], subject, text: body })
    });
    if (!r.ok) throw new Error(`Email service said ${r.status}: ${(await r.text()).slice(0, 200)}`);
    save2("sent");
    return { status: "sent" };
  } catch (e) {
    save2("failed", e.message);
    return { status: "failed", error: e.message };
  }
}
__name(sendMail, "sendMail");

// src/lib/drive.js
var driveConfigured = /* @__PURE__ */ __name((env) => !!(env.SCRIPT_URL && env.SCRIPT_SECRET), "driveConfigured");
async function call(env, payload) {
  if (!driveConfigured(env)) throw new HttpError(503, "Photo storage is not set up yet. Ask the admin to connect Google Drive.");
  return callScript(env, payload);
}
__name(call, "call");
var driveUpload = /* @__PURE__ */ __name((env, { name, mime, data, folder }) => call(env, { action: "upload", name, mime, data, folder }), "driveUpload");
var driveGet = /* @__PURE__ */ __name((env, id) => call(env, { action: "get", id }), "driveGet");
var driveDelete = /* @__PURE__ */ __name((env, id) => call(env, { action: "delete", id }), "driveDelete");

// src/routes/college.js
var LOCKED = /* @__PURE__ */ new Set(["submitted", "acknowledged"]);
var clog = /* @__PURE__ */ __name((ctx, action, detail) => log(ctx.db, "college", ctx.college.name, null, action, detail, ctx.ip), "clog");
async function daysWithVolunteers(db, collegeId) {
  const [days, vols, media] = await Promise.all([
    db.all(`SELECT d.id,d.date,d.village_id,d.notes,v.name village_name FROM days d JOIN villages v ON v.id=d.village_id WHERE d.college_id=? ORDER BY d.date,d.id`, collegeId),
    db.all(`SELECT x.* FROM volunteers x JOIN days d ON d.id=x.day_id WHERE d.college_id=? ORDER BY x.slot,x.id`, collegeId),
    db.all(`SELECT id,day_id,name FROM media WHERE college_id=? ORDER BY id`, collegeId)
  ]);
  const by = new Map(days.map((d) => [d.id, d]));
  days.forEach((d) => {
    d.volunteers = [];
    d.media = [];
  });
  vols.forEach((v) => by.get(v.day_id)?.volunteers.push(v));
  media.forEach((m) => by.get(m.day_id)?.media.push({ id: m.id, name: m.name }));
  return days;
}
__name(daysWithVolunteers, "daysWithVolunteers");
function reportFrom(days, villageId) {
  const ds = days.filter((d) => d.village_id === villageId);
  const t = { days: ds.length, attended: 0, absent: 0, addressed: 0, registered: 0 };
  for (const d of ds) for (const v of d.volunteers) {
    if (v.attended === 1) {
      t.attended++;
      t.addressed += v.addressed;
      t.registered += v.registered;
    } else if (v.attended === 0) t.absent++;
  }
  return { days: ds, totals: t };
}
__name(reportFrom, "reportFrom");
async function villageReport(db, collegeId, villageId) {
  return reportFrom(await daysWithVolunteers(db, collegeId), villageId);
}
__name(villageReport, "villageReport");
route("GET", "/api/college/me", "college", (ctx) => ({ id: ctx.college.id, name: ctx.college.name }));
route("GET", "/api/college/overview", "college", async (ctx) => {
  const { db, college: c } = ctx;
  const [days, asg, stats, requests, cert] = await Promise.all([
    daysWithVolunteers(db, c.id),
    db.all(`SELECT a.id,a.village_id,a.ack_status,a.query_note,a.ack_name,a.ack_designation,a.ack_at,a.submitted_at,a.distance_km road_km,a.distance_note,
      v.name village_name,v.taluk,v.lat,v.lng,v.officer_name,v.officer_phone,v.officer_email,v.lsgi,v.office_address,v.office_phone
      FROM assignments a JOIN villages v ON v.id=a.village_id WHERE a.college_id=? ORDER BY a.id`, c.id),
    collegeStats(db),
    db.all(`SELECT r.id,r.status,r.reason,r.admin_note,r.created_at,r.decided_at,r.assignment_id,
      tv.name to_village, fv.name from_village FROM change_requests r JOIN villages tv ON tv.id=r.to_village_id
      LEFT JOIN assignments a ON a.id=r.assignment_id LEFT JOIN villages fv ON fv.id=a.village_id
      WHERE r.college_id=? ORDER BY r.id DESC`, c.id),
    db.get("SELECT number,issued_at FROM certificates WHERE college_id=?", c.id)
  ]);
  const assignments = asg.map((a) => {
    const out = { ...a, distance_km: a.road_km ?? haversine(c.lat, c.lng, a.lat, a.lng), distance_road: a.road_km != null, totals: reportFrom(days, a.village_id).totals, locked: LOCKED.has(a.ack_status) };
    delete out.lat;
    delete out.lng;
    return out;
  });
  return {
    college: { id: c.id, name: c.name, short_name: c.short_name, address: c.address, phone: c.phone, email: c.email, coordinator: c.coordinator, lsgi: c.lsgi },
    stats: stats.find((s) => s.id === c.id),
    assignments,
    requests,
    days,
    today: todayStr(),
    certificate: cert || null,
    photos_enabled: driveConfigured(ctx.env)
  };
});
route("GET", "/api/college/villages", "college", async (ctx) => {
  const c = ctx.college;
  const [held, vs] = await Promise.all([
    ctx.db.all("SELECT village_id id,college_id cid FROM assignments"),
    ctx.db.all("SELECT id,name,taluk,lat,lng FROM villages ORDER BY name")
  ]);
  const owner = new Map(held.map((r) => [r.id, r.cid]));
  return vs.map((v) => ({ id: v.id, name: v.name, taluk: v.taluk, distance_km: haversine(c.lat, c.lng, v.lat, v.lng), mine: owner.get(v.id) === c.id, taken: owner.has(v.id) && owner.get(v.id) !== c.id })).sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
});
route("POST", "/api/college/requests", "college", async (ctx) => {
  const { db, college: c, body: b } = ctx;
  const to = Number(b.to_village_id);
  const village = await db.get("SELECT * FROM villages WHERE id=?", to);
  if (!village) throw bad("Choose a village from the list");
  const holder = await db.get("SELECT college_id FROM assignments WHERE village_id=?", to);
  if (holder && holder.college_id === c.id) throw bad("That village is already allotted to you");
  if (holder) throw bad("Sorry, that village is already taken by another college. Please pick a free one.");
  let aid = null;
  if (b.assignment_id) {
    const a = await db.get("SELECT * FROM assignments WHERE id=? AND college_id=?", Number(b.assignment_id), c.id);
    if (!a) throw bad("Pick one of your allotted villages to swap");
    if (LOCKED.has(a.ack_status)) throw bad("That village is already with the village officer for acknowledgement");
    if (await db.get("SELECT 1 x FROM change_requests WHERE assignment_id=? AND status='pending'", a.id)) throw bad("A change request for that village is already pending");
    aid = a.id;
  }
  const reason = reqStr(b.reason, "Please give a short reason", 500);
  await db.run("INSERT INTO change_requests(college_id,assignment_id,to_village_id,reason,created_at) VALUES (?,?,?,?,?)", c.id, aid, to, reason, nowIso());
  await clog(ctx, "request_change", `Requested ${village.name}`);
  return { ok: true };
});
route("DELETE", "/api/college/requests/:id", "college", async (ctx) => {
  const r = await ctx.db.run("DELETE FROM change_requests WHERE id=? AND college_id=? AND status='pending'", Number(ctx.params.id), ctx.college.id);
  if (!r.changes) throw bad("Only pending requests can be withdrawn");
  return { ok: true };
});
function cleanPair(list) {
  const out = [];
  for (const v of Array.isArray(list) ? list.slice(0, 4) : []) {
    const name = str(v.name, 80), contact = str(v.contact, 20);
    if (!name && !contact) continue;
    if (!name) throw bad("Volunteer name is required alongside the contact number");
    out.push({ name, contact: phone(contact, `Contact number for ${name}`) });
  }
  return out;
}
__name(cleanPair, "cleanPair");
async function lockedVillages(db, collegeId) {
  return new Set((await db.all("SELECT village_id id,ack_status s FROM assignments WHERE college_id=?", collegeId)).filter((a) => LOCKED.has(a.s)).map((a) => a.id));
}
__name(lockedVillages, "lockedVillages");
route("POST", "/api/college/schedule", "college", async (ctx) => {
  const { db, college: c, body: b } = ctx;
  if (!isDate(b.start) || !isDate(b.end) || b.end < b.start) throw bad("Choose a valid from and to date");
  const dates = dateRange(b.start, b.end, !!b.skip_sundays);
  if (!dates.length) throw bad("No days fall in that range");
  if (dates.length > 45) throw bad("Please keep the schedule within 45 days");
  const per = int(b.per_village || 3, "Days per village", { min: 1, max: 15 });
  const locked = await lockedVillages(db, c.id);
  const open = (await db.all("SELECT village_id id FROM assignments WHERE college_id=? ORDER BY id", c.id)).map((r) => r.id).filter((id) => !locked.has(id));
  if (!open.length) throw bad("You have no villages available to schedule. Ask the admin to allot villages.");
  const pair = cleanPair(b.volunteers);
  const existing = await db.all(`SELECT d.id,(SELECT COUNT(*) FROM volunteers v WHERE v.day_id=d.id AND v.attended IS NOT NULL) rec
    FROM days d WHERE d.college_id=? AND d.village_id IN (${open.map(() => "?").join(",")})`, c.id, ...open);
  if (existing.length && !b.replace) throw new HttpError(409, "You already have a schedule. Replace it?", { code: "exists" });
  if (existing.some((e) => e.rec)) throw new HttpError(409, "Attendance has already been recorded, so the schedule cannot be replaced in one go. Edit or delete individual days instead.", { code: "has_data" });
  await db.tx(async (tx) => {
    for (const e of existing) await tx.run("DELETE FROM days WHERE id=?", e.id);
    for (const [i, date] of dates.entries()) {
      const village = open[Math.floor(i / per) % open.length];
      const id = await tx.insert("INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)", c.id, village, date, nowIso());
      for (const [s, v] of pair.entries()) await tx.run("INSERT INTO volunteers(day_id,slot,name,contact) VALUES (?,?,?,?)", id, s, v.name, v.contact);
    }
  });
  await clog(ctx, "schedule", `${dates.length} days from ${dates[0]} to ${dates.at(-1)}`);
  return { ok: true, days: dates.length };
});
async function ownDay(ctx, id) {
  const d = await ctx.db.get("SELECT * FROM days WHERE id=? AND college_id=?", Number(id), ctx.college.id);
  if (!d) throw new HttpError(404, "Day not found");
  if ((await lockedVillages(ctx.db, ctx.college.id)).has(d.village_id)) throw new HttpError(423, "This village has been sent to the village officer, so it is locked. Ask the admin if a correction is needed.");
  return d;
}
__name(ownDay, "ownDay");
async function ownAssignedVillage(ctx, vid) {
  const a = await ctx.db.get("SELECT * FROM assignments WHERE college_id=? AND village_id=?", ctx.college.id, Number(vid));
  if (!a) throw bad("That village is not allotted to you");
  if (LOCKED.has(a.ack_status)) throw new HttpError(423, "That village is locked for acknowledgement");
  return a;
}
__name(ownAssignedVillage, "ownAssignedVillage");
route("POST", "/api/college/days", "college", async (ctx) => {
  const { db, body: b, college: c } = ctx;
  if (!isDate(b.date)) throw bad("Choose a valid date");
  await ownAssignedVillage(ctx, b.village_id);
  const vid = Number(b.village_id);
  const id = await db.insert("INSERT INTO days(college_id,village_id,date,created_at) VALUES (?,?,?,?)", c.id, vid, b.date, nowIso());
  const last = await db.get("SELECT id FROM days WHERE college_id=? AND village_id=? AND id<>? ORDER BY date DESC,id DESC LIMIT 1", c.id, vid, id);
  if (last) for (const v of await db.all("SELECT slot,name,contact FROM volunteers WHERE day_id=? ORDER BY slot", last.id))
    await db.run("INSERT INTO volunteers(day_id,slot,name,contact) VALUES (?,?,?,?)", id, v.slot, v.name, v.contact);
  await clog(ctx, "day_add", b.date);
  return { ok: true, id };
});
route("PATCH", "/api/college/days/:id", "college", async (ctx) => {
  const d = await ownDay(ctx, ctx.params.id), b = ctx.body;
  const date = b.date ?? d.date;
  if (!isDate(date)) throw bad("Choose a valid date");
  let vid = d.village_id;
  if (b.village_id != null && Number(b.village_id) !== d.village_id) {
    await ownAssignedVillage(ctx, b.village_id);
    vid = Number(b.village_id);
  }
  await ctx.db.run("UPDATE days SET date=?,village_id=?,notes=? WHERE id=?", date, vid, str(b.notes ?? d.notes, 300), d.id);
  return { ok: true };
});
route("DELETE", "/api/college/days/:id", "college", async (ctx) => {
  const d = await ownDay(ctx, ctx.params.id);
  const files = await ctx.db.all("SELECT drive_id FROM media WHERE day_id=?", d.id);
  await ctx.db.run("DELETE FROM days WHERE id=?", d.id);
  ctx.waitUntil(Promise.allSettled(files.map((f) => driveDelete(ctx.env, f.drive_id))));
  await clog(ctx, "day_delete", d.date);
  return { ok: true };
});
route("PUT", "/api/college/days/:id/volunteers", "college", async (ctx) => {
  const d = await ownDay(ctx, ctx.params.id);
  const list = Array.isArray(ctx.body.volunteers) ? ctx.body.volunteers.slice(0, 4) : [];
  const future = d.date > todayStr();
  const rows = [];
  for (const v of list) {
    const name = str(v.name, 80), contact = str(v.contact, 20);
    if (!name && !contact) continue;
    if (!name) throw bad("Enter the volunteer name");
    const att = v.attended === 1 || v.attended === true ? 1 : v.attended === 0 || v.attended === false ? 0 : null;
    if (att !== null && future) throw bad(`${d.date} is still in the future, so attendance can't be marked yet`);
    let addressed = 0, registered = 0;
    if (att === 1) {
      addressed = int(v.addressed, `People addressed (${name})`);
      registered = int(v.registered, `Registered count (${name})`);
      if (registered > addressed) throw bad(`${name}: registered can't be more than people addressed`);
    }
    rows.push({ name, contact: phone(contact, `Contact number for ${name}`), att, addressed, registered });
  }
  await ctx.db.tx(async (tx) => {
    await tx.run("DELETE FROM volunteers WHERE day_id=?", d.id);
    for (const [i, r] of rows.entries()) await tx.run("INSERT INTO volunteers(day_id,slot,name,contact,attended,addressed,registered) VALUES (?,?,?,?,?,?,?)", d.id, i, r.name, r.contact, r.att, r.addressed, r.registered);
  });
  return { ok: true };
});
route("POST", "/api/college/block-volunteers", "college", async (ctx) => {
  await ownAssignedVillage(ctx, ctx.body.village_id);
  const pair = cleanPair(ctx.body.volunteers);
  const days = await ctx.db.all("SELECT id FROM days WHERE college_id=? AND village_id=?", ctx.college.id, Number(ctx.body.village_id));
  await ctx.db.tx(async (tx) => {
    for (const d of days) {
      const cur = await tx.all("SELECT id,slot FROM volunteers WHERE day_id=? ORDER BY slot,id", d.id);
      for (const [i, v] of pair.entries()) {
        if (cur[i]) await tx.run("UPDATE volunteers SET name=?,contact=? WHERE id=?", v.name, v.contact, cur[i].id);
        else await tx.run("INSERT INTO volunteers(day_id,slot,name,contact) VALUES (?,?,?,?)", d.id, i, v.name, v.contact);
      }
      for (const extra of cur.slice(pair.length)) await tx.run("DELETE FROM volunteers WHERE id=? AND attended IS NULL", extra.id);
    }
  });
  await clog(ctx, "volunteers_set", `${pair.length} volunteers for ${days.length} days`);
  return { ok: true, days: days.length };
});
var MAX_PHOTOS = 8;
var MAX_BYTES = 4 * 1024 * 1024;
route("POST", "/api/college/days/:id/photos", "college", async (ctx) => {
  const d = await ownDay(ctx, ctx.params.id), b = ctx.body;
  if (!/^image\/(jpeg|png|webp)$/.test(b.mime || "")) throw bad("Please upload a JPG, PNG or WebP photo");
  const data = String(b.data || "");
  if (!data || data.length * 0.75 > MAX_BYTES) throw bad("Photo is too large (max 4 MB). Try a smaller one.");
  if ((await ctx.db.get("SELECT COUNT(*) n FROM media WHERE day_id=?", d.id)).n >= MAX_PHOTOS) throw bad(`You can add up to ${MAX_PHOTOS} photos per day`);
  const ext = b.mime.split("/")[1].replace("jpeg", "jpg");
  const up = await driveUpload(ctx.env, { name: `${d.date}_${Date.now()}.${ext}`, mime: b.mime, data, folder: `${ctx.college.name} (#${ctx.college.id})` });
  const id = await ctx.db.insert(
    "INSERT INTO media(day_id,college_id,drive_id,name,mime,size,created_at) VALUES (?,?,?,?,?,?,?)",
    d.id,
    ctx.college.id,
    up.id,
    str(b.name, 100) || "photo",
    b.mime,
    Math.round(data.length * 0.75),
    nowIso()
  );
  return { ok: true, id };
});
route("DELETE", "/api/college/photos/:id", "college", async (ctx) => {
  const m = await ctx.db.get("SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=? AND m.college_id=?", Number(ctx.params.id), ctx.college.id);
  if (!m) throw new HttpError(404, "Photo not found");
  if ((await lockedVillages(ctx.db, ctx.college.id)).has(m.village_id)) throw new HttpError(423, "This village is locked for acknowledgement");
  await ctx.db.run("DELETE FROM media WHERE id=?", m.id);
  ctx.waitUntil(driveDelete(ctx.env, m.drive_id).catch(() => {
  }));
  return { ok: true };
});
async function photoResponse(ctx, row) {
  const f = await driveGet(ctx.env, row.drive_id);
  const bytes = Uint8Array.from(atob(f.data), (ch) => ch.charCodeAt(0));
  return { __raw: true, bytes, headers: { "Content-Type": row.mime || f.mime, "Cache-Control": "private, max-age=3600" } };
}
__name(photoResponse, "photoResponse");
route("GET", "/api/college/photos/:id", "college", async (ctx) => {
  const m = await ctx.db.get("SELECT * FROM media WHERE id=? AND college_id=?", Number(ctx.params.id), ctx.college.id);
  if (!m) throw new HttpError(404, "Photo not found");
  return photoResponse(ctx, m);
});
route("POST", "/api/college/submit-village", "college", async (ctx) => {
  const { db, college: c, env } = ctx;
  const a = await ownAssignedVillage(ctx, ctx.body.village_id);
  const village = await db.get("SELECT * FROM villages WHERE id=?", a.village_id);
  const { days, totals } = await villageReport(db, c.id, a.village_id);
  if (!days.length) throw bad("Schedule at least one day for this village first");
  const problems = [];
  for (const d of days) {
    if (d.date > todayStr()) problems.push(`${d.date} is still in the future`);
    else if (!d.volunteers.length) problems.push(`${d.date} has no volunteers`);
    else if (d.volunteers.some((v) => v.attended == null)) problems.push(`${d.date} has attendance not marked`);
  }
  if (problems.length) throw bad("Finish these before sending to the village officer: " + problems.slice(0, 4).join("; ") + (problems.length > 4 ? "\u2026" : ""));
  if (!totals.attended) throw bad("No volunteer attended any day, so there is nothing to acknowledge");
  const tk = a.ack_token || token(18);
  await db.run("UPDATE assignments SET ack_status='submitted',ack_token=?,submitted_at=?,query_note=NULL WHERE id=?", tk, nowIso(), a.id);
  const link = `${env.BASE_URL || new URL(ctx.req.url).origin}/#/ack/${tk}`;
  const mail = await sendMail(
    db,
    env,
    village.officer_email,
    `Please acknowledge Electoral Literacy Club work in ${village.name}`,
    `Dear ${village.officer_name || "Village Officer"},

${c.name} has completed its Electoral Literacy Club voter-enrolment activity in ${village.name}: ${totals.attended} volunteer-days, ${totals.addressed} people addressed, ${totals.registered} registered.

Please review and acknowledge the report here (no login needed):
${link}

Thank you,
ELC Kozhikode`
  );
  await clog(ctx, "submit_village", `${village.name} sent for acknowledgement`);
  return { ok: true, emailed: mail.status };
});

// src/routes/admin.js
var STAFF = "staff";
var OPS = ["super_admin", "admin"];
var SUPER = ["super_admin"];
var slog = /* @__PURE__ */ __name((ctx, action, detail) => log(ctx.db, "staff", ctx.user.username, ctx.user.role, action, detail, ctx.ip), "slog");
var base = /* @__PURE__ */ __name((ctx) => ctx.env.BASE_URL || new URL(ctx.req.url).origin, "base");
var inList = /* @__PURE__ */ __name((ids) => ids.length ? ids.map(() => "?").join(",") : "NULL", "inList");
route("GET", "/api/staff/me", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  return { user: ctx.user, scope: s && { colleges: [...s.colleges], villages: [...s.villages] }, smtp: mailConfigured(ctx.env), drive: driveConfigured(ctx.env), sheet_url: ctx.env.SHEET_URL || null };
});
route("GET", "/api/staff/dashboard", STAFF, async (ctx) => {
  const { db } = ctx, s = await scopeOf(ctx);
  const stats = (await collegeStats(db)).filter((c) => !s || s.colleges.has(c.id));
  const sum = /* @__PURE__ */ __name((k) => stats.reduce((t, c) => t + c[k], 0), "sum");
  const cids = stats.map((c) => c.id), L = inList(cids);
  const [pending, awaiting, noPass] = await Promise.all([
    db.get(`SELECT COUNT(*) n FROM change_requests WHERE status='pending' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM assignments WHERE ack_status='submitted' AND college_id IN (${L})`, ...cids),
    db.get(`SELECT COUNT(*) n FROM colleges WHERE active=1 AND passcode_sent_at IS NULL AND id IN (${L})`, ...cids)
  ]);
  return {
    totals: {
      colleges: stats.length,
      villages: sum("villages"),
      volunteers: sum("volunteers"),
      days_done: sum("days_done"),
      addressed: sum("addressed"),
      registered: sum("registered"),
      villages_ack: sum("villages_ack"),
      pending_requests: pending.n,
      awaiting_ack: awaiting.n,
      passcode_pending: noPass.n
    },
    colleges: stats
  };
});
function collegeBody(b) {
  const o = {
    name: reqStr(b.name, "College name", 160),
    short_name: str(b.short_name, 40),
    address: reqStr(b.address, "Address", 300),
    phone: reqStr(b.phone, "Contact number", 30),
    email: emailOk(b.email, "College email"),
    coordinator: str(b.coordinator, 100),
    lat: num(b.lat),
    lng: num(b.lng),
    lsgi: str(b.lsgi, 120)
  };
  if (o.lat != null && (o.lat < 8 || o.lat > 13 || o.lng == null)) throw bad("Latitude/longitude look wrong for Kerala");
  return o;
}
__name(collegeBody, "collegeBody");
route("GET", "/api/staff/colleges", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const [stats, rows] = await Promise.all([collegeStats(ctx.db), ctx.db.all("SELECT id,name,short_name,address,phone,email,coordinator,lat,lng,lsgi,passcode_sent_at,passcode_plain AS passcode,last_login_at,active FROM colleges ORDER BY name")]);
  const m = new Map(stats.map((c) => [c.id, c]));
  return rows.filter((c) => !s || s.colleges.has(c.id)).map((c) => ({ ...c, stats: m.get(c.id) || null }));
});
route("POST", "/api/staff/colleges", OPS, async (ctx) => {
  const o = collegeBody(ctx.body);
  const id = await ctx.db.insert(
    "INSERT INTO colleges(name,short_name,address,phone,email,coordinator,lat,lng,lsgi,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    o.name,
    o.short_name,
    o.address,
    o.phone,
    o.email,
    o.coordinator,
    o.lat,
    o.lng,
    o.lsgi,
    nowIso()
  );
  await slog(ctx, "college_add", o.name);
  const { code } = await pushPasscode(ctx, id);
  return { ok: true, id, code };
});
route("PUT", "/api/staff/colleges/:id", STAFF, async (ctx) => {
  await assertCollege(ctx, ctx.params.id);
  const o = collegeBody(ctx.body);
  await ctx.db.run(
    "UPDATE colleges SET name=?,short_name=?,address=?,phone=?,email=?,coordinator=?,lat=?,lng=?,lsgi=? WHERE id=?",
    o.name,
    o.short_name,
    o.address,
    o.phone,
    o.email,
    o.coordinator,
    o.lat,
    o.lng,
    o.lsgi,
    Number(ctx.params.id)
  );
  await slog(ctx, "college_edit", o.name);
  return { ok: true };
});
route("POST", "/api/staff/colleges/:id/active", OPS, async (ctx) => {
  const id = Number(ctx.params.id), on = ctx.body.active ? 1 : 0;
  const c = await ctx.db.get("SELECT name FROM colleges WHERE id=?", id);
  if (!c) throw new HttpError(404, "College not found");
  await ctx.db.run("UPDATE colleges SET active=? WHERE id=?", on, id);
  await slog(ctx, on ? "college_activate" : "college_deactivate", c.name);
  return { ok: true };
});
route("DELETE", "/api/staff/colleges/:id", SUPER, async (ctx) => {
  const id = Number(ctx.params.id);
  const c = await ctx.db.get("SELECT name FROM colleges WHERE id=?", id);
  if (!c) throw new HttpError(404, "College not found");
  await ctx.db.run("DELETE FROM colleges WHERE id=?", id);
  await slog(ctx, "college_delete", c.name + " (and all its schedule data)");
  return { ok: true };
});
async function pushPasscode(ctx, id) {
  const c = await ctx.db.get("SELECT name FROM colleges WHERE id=?", id);
  if (!c) throw new HttpError(404, "College not found");
  const code = newPasscode();
  await ctx.db.run("UPDATE colleges SET passcode_hash=?,passcode_plain=?,passcode_sent_at=? WHERE id=?", await hashSecret(code.replace("-", ""), 2e4), code, nowIso(), id);
  await slog(ctx, "passcode_generate", c.name);
  return { college: c.name, code };
}
__name(pushPasscode, "pushPasscode");
route("POST", "/api/staff/colleges/:id/passcode", STAFF, async (ctx) => {
  await assertCollege(ctx, ctx.params.id);
  return pushPasscode(ctx, Number(ctx.params.id));
});
route("POST", "/api/staff/passcodes/bulk", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const ids = (await ctx.db.all("SELECT id FROM colleges WHERE active=1 AND passcode_sent_at IS NULL")).map((r) => r.id).filter((id) => !s || s.colleges.has(id));
  const results = [];
  for (const id of ids) results.push(await pushPasscode(ctx, id));
  return { results };
});
route("GET", "/api/staff/villages", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const [cnt, vs] = await Promise.all([ctx.db.all("SELECT village_id id,COUNT(*) n FROM assignments GROUP BY village_id"), ctx.db.all("SELECT * FROM villages ORDER BY taluk,name")]);
  const m = new Map(cnt.map((r) => [r.id, r.n]));
  return vs.filter((v) => !s || s.villages.has(v.id)).map((v) => ({ ...v, colleges: m.get(v.id) || 0 }));
});
function villageBody(b) {
  const o = {
    name: reqStr(b.name, "Village name", 80),
    taluk: str(b.taluk, 60),
    lat: num(b.lat),
    lng: num(b.lng),
    officer_name: str(b.officer_name, 100),
    officer_phone: str(b.officer_phone, 30),
    officer_email: str(b.officer_email, 120).toLowerCase(),
    lsgi: str(b.lsgi, 120),
    office_address: str(b.office_address, 300),
    office_phone: str(b.office_phone, 80)
  };
  if (o.officer_email) emailOk(o.officer_email, "Officer email");
  return o;
}
__name(villageBody, "villageBody");
route("POST", "/api/staff/villages", OPS, async (ctx) => {
  const o = villageBody(ctx.body);
  try {
    const id = await ctx.db.insert("INSERT INTO villages(name,taluk,lat,lng,officer_name,officer_phone,officer_email,lsgi,office_address,office_phone) VALUES (?,?,?,?,?,?,?,?,?,?)", o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email, o.lsgi, o.office_address, o.office_phone);
    await slog(ctx, "village_add", o.name);
    return { ok: true, id };
  } catch (e) {
    if (isDup(e)) throw bad("A village with that name already exists");
    throw e;
  }
});
route("PUT", "/api/staff/villages/:id", STAFF, async (ctx) => {
  await assertVillage(ctx, ctx.params.id);
  const o = villageBody(ctx.body);
  try {
    await ctx.db.run("UPDATE villages SET name=?,taluk=?,lat=?,lng=?,officer_name=?,officer_phone=?,officer_email=?,lsgi=?,office_address=?,office_phone=? WHERE id=?", o.name, o.taluk, o.lat, o.lng, o.officer_name, o.officer_phone, o.officer_email, o.lsgi, o.office_address, o.office_phone, Number(ctx.params.id));
  } catch (e) {
    if (isDup(e)) throw bad("A village with that name already exists");
    throw e;
  }
  await slog(ctx, "village_edit", o.name);
  return { ok: true };
});
route("DELETE", "/api/staff/villages/:id", SUPER, async (ctx) => {
  const id = Number(ctx.params.id);
  const v = await ctx.db.get("SELECT name FROM villages WHERE id=?", id);
  if (!v) throw new HttpError(404, "Village not found");
  if (await ctx.db.get("SELECT 1 x FROM assignments WHERE village_id=?", id)) throw bad("This village is allotted to a college. Remove the allotment first.");
  await ctx.db.run("DELETE FROM villages WHERE id=?", id);
  await slog(ctx, "village_delete", v.name);
  return { ok: true };
});
route("GET", "/api/staff/assignments", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT a.id,a.college_id,a.village_id,a.ack_status,a.created_at,a.distance_km road_km,a.distance_note,c.lsgi college_lsgi,v.lsgi village_lsgi,v.office_address,v.office_phone,
      c.name college,c.address college_address,c.phone college_phone,c.email college_email,c.coordinator,c.lat clat,c.lng clng,
      v.name village,v.taluk,v.lat vlat,v.lng vlng
      FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY c.name,a.id`);
  return rows.filter((a) => !s || s.colleges.has(a.college_id) && s.villages.has(a.village_id)).map((a) => {
    const d = a.road_km ?? haversine(a.clat, a.clng, a.vlat, a.vlng);
    delete a.clat;
    delete a.clng;
    delete a.vlat;
    delete a.vlng;
    return { ...a, distance_km: d, distance_road: a.road_km != null };
  });
});
route("GET", "/api/staff/colleges/:id/villages", STAFF, async (ctx) => {
  const id = Number(ctx.params.id);
  await assertCollege(ctx, id);
  const s = await scopeOf(ctx);
  const c = await ctx.db.get("SELECT lat,lng FROM colleges WHERE id=?", id);
  if (!c) throw new HttpError(404, "College not found");
  const [held, vs] = await Promise.all([
    ctx.db.all("SELECT a.village_id id,a.college_id cid,c.name holder FROM assignments a JOIN colleges c ON c.id=a.college_id"),
    ctx.db.all("SELECT id,name,taluk,lat,lng FROM villages")
  ]);
  const owner = new Map(held.map((r) => [r.id, r]));
  return vs.filter((v) => !s || s.villages.has(v.id)).map((v) => {
    const o = owner.get(v.id);
    return { id: v.id, name: v.name, taluk: v.taluk, distance_km: haversine(c.lat, c.lng, v.lat, v.lng), allotted: !!o && o.cid === id, holder: o && o.cid !== id ? o.holder : null };
  }).sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
});
route("POST", "/api/staff/assignments", STAFF, async (ctx) => {
  const cid = Number(ctx.body.college_id), vid = Number(ctx.body.village_id);
  await assertCollege(ctx, cid);
  await assertVillage(ctx, vid);
  const [c, v] = await Promise.all([ctx.db.get("SELECT name FROM colleges WHERE id=?", cid), ctx.db.get("SELECT name FROM villages WHERE id=?", vid)]);
  if (!c || !v) throw bad("Pick a college and a village");
  const held = await ctx.db.get("SELECT c.name FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.village_id=?", vid);
  if (held) throw bad(`${v.name} is already allotted to ${held.name}. Remove that allotment first.`);
  try {
    await ctx.db.run("INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)", cid, vid, nowIso());
  } catch (e) {
    if (isDup(e)) throw bad("That village was just taken by another college. Refresh and pick another.");
    throw e;
  }
  await slog(ctx, "assign", `${v.name} \u2192 ${c.name}`);
  return { ok: true };
});
route("DELETE", "/api/staff/assignments/:id", STAFF, async (ctx) => {
  const a = await ctx.db.get(`SELECT a.*,c.name college,v.name village FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id WHERE a.id=?`, Number(ctx.params.id));
  if (!a) throw new HttpError(404, "Allotment not found");
  await assertCollege(ctx, a.college_id);
  await assertVillage(ctx, a.village_id);
  if (a.ack_status === "acknowledged" && ctx.user.role !== "super_admin") throw new HttpError(403, "Only a super admin can remove an acknowledged village");
  await ctx.db.tx(async (tx) => {
    await tx.run("DELETE FROM days WHERE college_id=? AND village_id=?", a.college_id, a.village_id);
    await tx.run("DELETE FROM assignments WHERE id=?", a.id);
  });
  await slog(ctx, "unassign", `${a.village} \u2715 ${a.college}`);
  return { ok: true };
});
route("GET", "/api/staff/requests", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const rows = await ctx.db.all(`SELECT r.*,c.name college,c.phone college_phone,tv.name to_village,tv.taluk to_taluk,fv.name from_village,
      c.lat clat,c.lng clng,tv.lat tlat,tv.lng tlng, a.village_id from_vid
      FROM change_requests r JOIN colleges c ON c.id=r.college_id JOIN villages tv ON tv.id=r.to_village_id
      LEFT JOIN assignments a ON a.id=r.assignment_id LEFT JOIN villages fv ON fv.id=a.village_id
      ORDER BY (r.status='pending') DESC, r.id DESC`);
  return rows.filter((r) => !s || s.colleges.has(r.college_id)).map((r) => {
    const d = haversine(r.clat, r.clng, r.tlat, r.tlng);
    delete r.clat;
    delete r.clng;
    delete r.tlat;
    delete r.tlng;
    return { ...r, distance_km: d };
  });
});
route("POST", "/api/staff/requests/:id/decide", STAFF, async (ctx) => {
  const r = await ctx.db.get("SELECT * FROM change_requests WHERE id=?", Number(ctx.params.id));
  if (!r) throw new HttpError(404, "Request not found");
  await assertCollege(ctx, r.college_id);
  if (r.status !== "pending") throw bad("This request was already decided");
  const approve = ctx.body.decision === "approve", note = str(ctx.body.note, 300);
  if (approve) {
    await assertVillage(ctx, r.to_village_id);
    await ctx.db.tx(async (tx) => {
      const a = r.assignment_id ? await tx.get("SELECT * FROM assignments WHERE id=?", r.assignment_id) : null;
      if (await tx.get("SELECT 1 x FROM assignments WHERE village_id=?", r.to_village_id)) throw bad("That village is already allotted (to this or another college), so this request cannot be approved. Reject it or free the village first.");
      if (a) {
        if (LOCKED.has(a.ack_status)) throw bad("The current village is already with the officer for acknowledgement");
        await tx.run("UPDATE assignments SET village_id=?,ack_status='none',ack_token=NULL WHERE id=?", r.to_village_id, a.id);
        await tx.run("UPDATE days SET village_id=? WHERE college_id=? AND village_id=?", r.to_village_id, r.college_id, a.village_id);
      } else await tx.run("INSERT INTO assignments(college_id,village_id,created_at) VALUES (?,?,?)", r.college_id, r.to_village_id, nowIso());
    });
  }
  await ctx.db.run("UPDATE change_requests SET status=?,admin_note=?,decided_by=?,decided_at=? WHERE id=?", approve ? "approved" : "rejected", note, ctx.user.username, nowIso(), r.id);
  await slog(ctx, approve ? "request_approve" : "request_reject", `request #${r.id}${note ? " - " + note : ""}`);
  return { ok: true };
});
route("GET", "/api/staff/acks", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const rows = (await ctx.db.all(`SELECT a.id,a.college_id,a.village_id,a.ack_status,a.ack_token,a.submitted_at,a.ack_name,a.ack_designation,a.ack_remarks,a.ack_at,a.query_note,
      c.name college,v.name village,v.taluk,v.officer_name,v.officer_phone,v.officer_email FROM assignments a
      JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id
      WHERE a.ack_status<>'none' OR a.query_note IS NOT NULL ORDER BY a.submitted_at DESC NULLS LAST`)).filter((a) => !s || s.colleges.has(a.college_id) && s.villages.has(a.village_id));
  const cache = /* @__PURE__ */ new Map(), out = [];
  for (const a of rows) {
    if (!cache.has(a.college_id)) cache.set(a.college_id, await daysWithVolunteers(ctx.db, a.college_id));
    const days = cache.get(a.college_id);
    out.push({
      ...a,
      link: a.ack_token ? `${base(ctx)}/#/ack/${a.ack_token}` : null,
      totals: reportFrom(days, a.village_id).totals,
      photos: days.filter((d) => d.village_id === a.village_id).flatMap((d) => d.media.map((m) => ({ ...m, date: d.date })))
    });
  }
  return out;
});
route("GET", "/api/staff/photos/:id", STAFF, async (ctx) => {
  const m = await ctx.db.get("SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=?", Number(ctx.params.id));
  if (!m) throw new HttpError(404, "Photo not found");
  await assertCollege(ctx, m.college_id);
  await assertVillage(ctx, m.village_id);
  return photoResponse(ctx, m);
});
route("POST", "/api/staff/acks/:id/resend", STAFF, async (ctx) => {
  const a = await ctx.db.get("SELECT a.*,c.name college FROM assignments a JOIN colleges c ON c.id=a.college_id WHERE a.id=?", Number(ctx.params.id));
  if (!a || a.ack_status !== "submitted") throw bad("Nothing awaiting acknowledgement here");
  await assertCollege(ctx, a.college_id);
  await assertVillage(ctx, a.village_id);
  const v = await ctx.db.get("SELECT * FROM villages WHERE id=?", a.village_id);
  const r = await sendMail(
    ctx.db,
    ctx.env,
    v.officer_email,
    `Reminder: please acknowledge ELC work in ${v.name}`,
    `Dear ${v.officer_name || "Village Officer"},

Please review and acknowledge the Electoral Literacy Club report by ${a.college}:
${base(ctx)}/#/ack/${a.ack_token}

Thank you,
ELC Kozhikode`
  );
  await slog(ctx, "ack_resend", `${v.name} (${r.status})`);
  return r;
});
route("POST", "/api/staff/acks/:id/override", STAFF, async (ctx) => {
  const a = await ctx.db.get("SELECT a.*,v.name village,c.name college FROM assignments a JOIN villages v ON v.id=a.village_id JOIN colleges c ON c.id=a.college_id WHERE a.id=?", Number(ctx.params.id));
  if (!a) throw new HttpError(404, "Not found");
  await assertCollege(ctx, a.college_id);
  await assertVillage(ctx, a.village_id);
  const mode = ctx.body.mode;
  if (mode === "acknowledge") {
    if (a.ack_status === "none") throw bad("The college has not submitted this village yet");
    const name = reqStr(ctx.body.officer_name, "Officer name", 100);
    await ctx.db.run(
      "UPDATE assignments SET ack_status='acknowledged',ack_name=?,ack_designation=?,ack_remarks=?,ack_at=? WHERE id=?",
      name,
      str(ctx.body.designation, 100),
      `Recorded by ${ctx.user.username} on behalf of officer. ${str(ctx.body.remarks, 300)}`,
      nowIso(),
      a.id
    );
    await slog(ctx, "ack_on_behalf", `${a.village} / ${a.college} by ${name}`);
  } else if (mode === "unlock") {
    await ctx.db.run("UPDATE assignments SET ack_status='none',ack_token=NULL,query_note=? WHERE id=?", str(ctx.body.note, 300) || "Reopened by admin for corrections", a.id);
    await ctx.db.run("DELETE FROM certificates WHERE college_id=?", a.college_id);
    await slog(ctx, "ack_unlock", `${a.village} / ${a.college}`);
  } else throw bad("Unknown action");
  return { ok: true };
});
async function reportData(db, type, s) {
  const okC = /* @__PURE__ */ __name((id) => !s || s.colleges.has(id), "okC");
  if (type === "colleges") return {
    cols: [
      ["rank", "Rank"],
      ["name", "College"],
      ["villages", "Villages allotted"],
      ["villages_ack", "Villages acknowledged"],
      ["days_planned", "Days planned"],
      ["days_done", "Days held"],
      ["volunteers", "Volunteers"],
      ["vdays_attended", "Volunteer-days attended"],
      ["vdays_absent", "Volunteer-days absent"],
      ["attendance_pct", "Attendance %"],
      ["addressed", "People addressed"],
      ["registered", "Registered"],
      ["verified_registered", "Registered (acknowledged villages)"],
      ["score", "Score"]
    ],
    rows: (await collegeStats(db)).filter((c) => okC(c.id))
  };
  if (type === "volunteers") return {
    cols: [
      ["college", "College"],
      ["name", "Volunteer"],
      ["contact", "Contact"],
      ["days_assigned", "Days assigned"],
      ["days_attended", "Days attended"],
      ["days_absent", "Days absent"],
      ["addressed", "People addressed"],
      ["registered", "Registered"]
    ],
    rows: (await db.all(`SELECT college_id,college,name,contact,days_assigned,days_attended,days_absent,addressed,registered FROM (
      SELECT d.college_id, MIN(c.name) college, MIN(v.name) name, v.contact, COUNT(*) days_assigned, COALESCE(SUM((v.attended=1)),0) days_attended, COALESCE(SUM((v.attended=0)),0) days_absent,
      COALESCE(SUM(CASE WHEN v.attended=1 THEN v.addressed END),0) addressed, COALESCE(SUM(CASE WHEN v.attended=1 THEN v.registered END),0) registered
      FROM volunteers v JOIN days d ON d.id=v.day_id JOIN colleges c ON c.id=d.college_id WHERE v.name<>''
      GROUP BY d.college_id, lower(trim(v.name)), v.contact) t ORDER BY college, name`)).filter((r) => okC(r.college_id))
  };
  if (type === "villages") {
    const rows = (await db.all(`SELECT a.college_id,a.village_id,c.name college,v.name village,v.taluk,a.ack_status,a.ack_name,a.ack_designation,a.ack_at FROM assignments a
      JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id ORDER BY v.name`)).filter((r) => okC(r.college_id) && (!s || s.villages.has(r.village_id)));
    const cache = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (!cache.has(r.college_id)) cache.set(r.college_id, await daysWithVolunteers(db, r.college_id));
      const t = reportFrom(cache.get(r.college_id), r.village_id).totals;
      Object.assign(r, { days: t.days, attended: t.attended, addressed: t.addressed, registered: t.registered });
    }
    return { cols: [
      ["village", "Village"],
      ["taluk", "Taluk"],
      ["college", "College"],
      ["days", "Days"],
      ["attended", "Volunteer-days attended"],
      ["addressed", "People addressed"],
      ["registered", "Registered"],
      ["ack_status", "Acknowledgement"],
      ["ack_name", "Acknowledged by"],
      ["ack_designation", "Designation"],
      ["ack_at", "Acknowledged on"]
    ], rows };
  }
  if (type === "days") return {
    cols: [["date", "Date"], ["college", "College"], ["village", "Village"], ["volunteer", "Volunteer"], ["contact", "Contact"], ["attendance", "Attendance"], ["addressed", "People addressed"], ["registered", "Registered"]],
    rows: (await db.all(`SELECT d.college_id,d.village_id,d.date,c.name college,vg.name village,v.name volunteer,v.contact,
      CASE v.attended WHEN 1 THEN 'Present' WHEN 0 THEN 'Absent' ELSE 'Not marked' END attendance,v.addressed,v.registered
      FROM days d JOIN colleges c ON c.id=d.college_id JOIN villages vg ON vg.id=d.village_id LEFT JOIN volunteers v ON v.day_id=d.id
      ORDER BY d.date,c.name`)).filter((r) => okC(r.college_id) && (!s || s.villages.has(r.village_id)))
  };
  throw new HttpError(404, "Unknown report");
}
__name(reportData, "reportData");
route("GET", "/api/staff/reports/:type", STAFF, async (ctx) => {
  const r = await reportData(ctx.db, ctx.params.type, await scopeOf(ctx));
  if (ctx.query.format === "csv") {
    await slog(ctx, "report_export", ctx.params.type);
    return {
      __raw: true,
      text: csv(r.rows, r.cols.map(([key2, label]) => ({ key: key2, label }))),
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="elc-${ctx.params.type}-${nowIso().slice(0, 10)}.csv"` }
    };
  }
  return { cols: r.cols, rows: r.rows };
});
var certReady = /* @__PURE__ */ __name(async (db) => (await collegeStats(db)).filter((c) => c.villages > 0 && c.villages_ack === c.villages && c.vdays_attended > 0), "certReady");
route("GET", "/api/staff/certificates", STAFF, async (ctx) => {
  const s = await scopeOf(ctx);
  const issued = new Map((await ctx.db.all("SELECT * FROM certificates")).map((r) => [r.college_id, r]));
  const readyAll = await certReady(ctx.db);
  const ready = readyAll.filter((c) => !s || s.colleges.has(c.id)).map((c) => ({ ...c, certificate: issued.get(c.id) || null }));
  const readyIds = new Set(readyAll.map((r) => r.id));
  const waiting = (await collegeStats(ctx.db)).filter((c) => !readyIds.has(c.id) && (!s || s.colleges.has(c.id))).map((c) => ({ id: c.id, name: c.name, villages: c.villages, villages_ack: c.villages_ack, villages_submitted: c.villages_submitted }));
  return { ready, waiting };
});
route("POST", "/api/staff/certificates/:id/issue", SUPER, async (ctx) => {
  const id = Number(ctx.params.id);
  if (!(await certReady(ctx.db)).some((c) => c.id === id)) throw bad("Every village must be acknowledged before certificates can be issued");
  if (await ctx.db.get("SELECT 1 x FROM certificates WHERE college_id=?", id)) throw bad("Already issued");
  const n = (await ctx.db.get("SELECT COUNT(*) n FROM certificates")).n + 1;
  const number = `ELC/KKD/${(/* @__PURE__ */ new Date()).getFullYear()}/${String(n).padStart(4, "0")}`;
  await ctx.db.run("INSERT INTO certificates(college_id,number,issued_at,issued_by) VALUES (?,?,?,?)", id, number, nowIso(), ctx.user.username);
  await slog(ctx, "certificate_issue", `${number} \u2192 college #${id}`);
  return { ok: true, number };
});
route("GET", "/api/staff/certificates/:id", STAFF, async (ctx) => {
  const id = Number(ctx.params.id);
  await assertCollege(ctx, id);
  const [c, stats, cert, vols, villages] = await Promise.all([
    ctx.db.get("SELECT id,name,address FROM colleges WHERE id=?", id),
    collegeStats(ctx.db),
    ctx.db.get("SELECT * FROM certificates WHERE college_id=?", id),
    reportData(ctx.db, "volunteers", null),
    ctx.db.all(`SELECT v.name,v.taluk,a.ack_name,a.ack_designation,a.ack_at FROM assignments a JOIN villages v ON v.id=a.village_id WHERE a.college_id=? ORDER BY v.name`, id)
  ]);
  if (!c || !cert) throw new HttpError(404, "No certificate has been issued for this college yet");
  return { college: c, stats: stats.find((x) => x.id === id), certificate: cert, volunteers: vols.rows.filter((r) => r.college_id === id && r.days_attended > 0), villages };
});
route("GET", "/api/staff/logs", SUPER, (ctx) => {
  const k = ctx.query.kind;
  const where = k === "signin" ? "WHERE action IN ('login','login_failed','logout')" : k === "manage" ? "WHERE action NOT IN ('login','login_failed','logout')" : "";
  return ctx.db.all(`SELECT * FROM logs ${where} ORDER BY id DESC LIMIT 500`);
});
route("GET", "/api/staff/outbox", OPS, async (ctx) => ({ smtp: mailConfigured(ctx.env), rows: await ctx.db.all("SELECT * FROM outbox ORDER BY id DESC LIMIT 200") }));
route("GET", "/api/staff/team", SUPER, async (ctx) => {
  const [rows, cs, vs] = await Promise.all([
    ctx.db.all("SELECT id,username,name,email,role,active,last_login_at,created_at FROM admins ORDER BY role,name"),
    ctx.db.all("SELECT admin_id,college_id id FROM intern_colleges"),
    ctx.db.all("SELECT admin_id,village_id id FROM intern_villages")
  ]);
  return rows.map((r) => ({ ...r, colleges: cs.filter((x) => x.admin_id === r.id).map((x) => x.id), villages: vs.filter((x) => x.admin_id === r.id).map((x) => x.id) }));
});
var checkPw = /* @__PURE__ */ __name((p) => {
  if (String(p || "").length < 8) throw bad("Password must be at least 8 characters");
  return p;
}, "checkPw");
route("POST", "/api/staff/team", SUPER, async (ctx) => {
  const b = ctx.body;
  const username = reqStr(b.username, "Username", 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw bad("Username: letters, numbers, dot, dash, underscore (min 3)");
  if (!["super_admin", "admin", "intern"].includes(b.role)) throw bad("Choose a role");
  const name = reqStr(b.name, "Name", 100), pass = await hashSecret(checkPw(b.password));
  try {
    const id = await ctx.db.insert("INSERT INTO admins(username,name,email,role,pass,created_at) VALUES (?,?,?,?,?,?)", username, name, str(b.email, 120), b.role, pass, nowIso());
    await slog(ctx, "staff_add", `${username} as ${b.role}`);
    return { ok: true, id };
  } catch (e) {
    if (isDup(e)) throw bad("That username is already taken");
    throw e;
  }
});
route("PUT", "/api/staff/team/:id", SUPER, async (ctx) => {
  const id = Number(ctx.params.id), b = ctx.body;
  const a = await ctx.db.get("SELECT * FROM admins WHERE id=?", id);
  if (!a) throw new HttpError(404, "Not found");
  const role = ["super_admin", "admin", "intern"].includes(b.role) ? b.role : a.role;
  const active = b.active === false || b.active === 0 ? 0 : 1;
  if (a.id === ctx.user.id && (role !== a.role || !active)) throw bad("You can't change your own role or deactivate yourself");
  const newPass = b.password ? await hashSecret(checkPw(b.password)) : null;
  await ctx.db.tx(async (tx) => {
    await tx.run("UPDATE admins SET name=?,email=?,role=?,active=? WHERE id=?", str(b.name, 100) || a.name, str(b.email, 120), role, active, id);
    if (newPass) await tx.run("UPDATE admins SET pass=? WHERE id=?", newPass, id);
    if (Array.isArray(b.colleges)) {
      await tx.run("DELETE FROM intern_colleges WHERE admin_id=?", id);
      for (const c of b.colleges) await tx.run("INSERT INTO intern_colleges VALUES (?,?) ON CONFLICT DO NOTHING", id, Number(c));
    }
    if (Array.isArray(b.villages)) {
      await tx.run("DELETE FROM intern_villages WHERE admin_id=?", id);
      for (const v of b.villages) await tx.run("INSERT INTO intern_villages VALUES (?,?) ON CONFLICT DO NOTHING", id, Number(v));
    }
  });
  await slog(ctx, "staff_edit", `${a.username} (${role}${active ? "" : ", deactivated"}${newPass ? ", password reset" : ""})`);
  return { ok: true };
});
route("POST", "/api/staff/password", STAFF, async (ctx) => {
  const a = await ctx.db.get("SELECT pass FROM admins WHERE id=?", ctx.user.id);
  if (!await verifySecret(String(ctx.body.current || ""), a.pass)) throw bad("Current password is incorrect");
  const newHash = await hashSecret(checkPw(ctx.body.next));
  await ctx.db.run("UPDATE admins SET pass=? WHERE id=?", newHash, ctx.user.id);
  await issueSession(ctx, "staff", { id: ctx.user.id, pass: newHash }, 8);
  await slog(ctx, "password_change", null);
  return { ok: true };
});
async function ackLookup(db, tk) {
  const a = await db.get(`SELECT a.*,c.name college,v.name village,v.taluk FROM assignments a JOIN colleges c ON c.id=a.college_id JOIN villages v ON v.id=a.village_id WHERE a.ack_token=?`, tk);
  if (!a) throw new HttpError(404, "This acknowledgement link is not valid or has been withdrawn");
  return a;
}
__name(ackLookup, "ackLookup");
route("GET", "/api/ack/:token", null, async (ctx) => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  const { days, totals } = await villageReport(ctx.db, a.college_id, a.village_id);
  return {
    college: a.college,
    village: a.village,
    taluk: a.taluk,
    status: a.ack_status,
    ack_name: a.ack_name,
    ack_designation: a.ack_designation,
    ack_at: a.ack_at,
    totals,
    days: days.map((d) => ({ date: d.date, media: d.media, volunteers: d.volunteers.map((v) => ({ name: v.name, attended: v.attended, addressed: v.addressed, registered: v.registered })) }))
  };
});
route("GET", "/api/ack/:token/photos/:id", null, async (ctx) => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  const m = await ctx.db.get("SELECT m.*,d.village_id FROM media m JOIN days d ON d.id=m.day_id WHERE m.id=?", Number(ctx.params.id));
  if (!m || m.college_id !== a.college_id || m.village_id !== a.village_id) throw new HttpError(404, "Photo not found");
  return photoResponse(ctx, m);
});
route("POST", "/api/ack/:token", null, async (ctx) => {
  const a = await ackLookup(ctx.db, ctx.params.token);
  if (a.ack_status !== "submitted") throw bad("This report is not waiting for acknowledgement");
  const action = ctx.body.action, name = reqStr(ctx.body.name, "Your name", 100);
  if (action === "acknowledge") {
    await ctx.db.run(
      "UPDATE assignments SET ack_status='acknowledged',ack_name=?,ack_designation=?,ack_remarks=?,ack_at=?,query_note=NULL WHERE id=?",
      name,
      reqStr(ctx.body.designation, "Designation", 100),
      str(ctx.body.remarks, 500),
      nowIso(),
      a.id
    );
    await log(ctx.db, "officer", name, null, "acknowledge", `${a.village} / ${a.college}`, ctx.ip);
  } else if (action === "query") {
    const note = reqStr(ctx.body.remarks, "Please say what needs correcting", 500);
    await ctx.db.run("UPDATE assignments SET ack_status='none',query_note=? WHERE id=?", `${name}: ${note}`, a.id);
    await log(ctx.db, "officer", name, null, "ack_query", `${a.village} / ${a.college}: ${note}`, ctx.ip);
  } else throw bad("Unknown action");
  return { ok: true };
});

// src/app.js
var boardCache = { at: 0, data: null };
route("GET", "/api/public/board", null, async (ctx) => {
  if (boardCache.data && Date.now() - boardCache.at < 2e4) return boardCache.data;
  boardCache = { at: Date.now(), data: await publicBoard(ctx.db) };
  return boardCache.data;
});
route("GET", "/api/public/colleges", null, (ctx) => ctx.db.all("SELECT id,name FROM colleges WHERE active=1 ORDER BY name"));
route("POST", "/api/auth/college", null, async (ctx) => {
  const id = Number(ctx.body.college_id), key2 = `c:${ctx.ip}:${id}`;
  await ctx.throttle(key2);
  const c = await ctx.db.get("SELECT * FROM colleges WHERE id=? AND active=1", id);
  if (!c || !c.passcode_hash || !await verifySecret(normPasscode(ctx.body.passcode), c.passcode_hash)) {
    await log(ctx.db, "college", c ? c.name : `id:${id}`, null, "login_failed", "Wrong passcode or passcode not issued", ctx.ip);
    throw new HttpError(401, "That passcode did not work. Check the email your coordinator received.");
  }
  await ctx.clearThrottle(key2);
  await ctx.db.run("UPDATE colleges SET last_login_at=? WHERE id=?", (/* @__PURE__ */ new Date()).toISOString(), c.id);
  await log(ctx.db, "college", c.name, null, "login", "College signed in", ctx.ip);
  await issueSession(ctx, "college", c, 12);
  ctx.db.lazy = true;
  return { ok: true };
});
route("POST", "/api/auth/college/logout", null, async (ctx) => {
  const c = await sessionUser(ctx, "college");
  if (c) await log(ctx.db, "college", c.name, null, "logout", null, ctx.ip);
  setCookie(ctx, COOKIE.college, "", 0);
  return { ok: true };
});
route("POST", "/api/auth/staff", null, async (ctx) => {
  const username = String(ctx.body.username || "").trim().toLowerCase(), key2 = `s:${ctx.ip}:${username}`;
  await ctx.throttle(key2);
  const a = await ctx.db.get("SELECT * FROM admins WHERE username=?", username);
  if (!a || !a.active || !await verifySecret(String(ctx.body.password || ""), a.pass)) {
    await log(ctx.db, "staff", username, a && a.role, "login_failed", a && !a.active ? "Deactivated account" : "Wrong username or password", ctx.ip);
    throw new HttpError(401, "Incorrect username or password");
  }
  await ctx.clearThrottle(key2);
  await ctx.db.run("UPDATE admins SET last_login_at=? WHERE id=?", (/* @__PURE__ */ new Date()).toISOString(), a.id);
  await log(ctx.db, "staff", a.username, a.role, "login", "Signed in", ctx.ip);
  await issueSession(ctx, "staff", a, 8);
  ctx.db.lazy = true;
  return { ok: true };
});
route("POST", "/api/auth/staff/logout", null, async (ctx) => {
  const u = await sessionUser(ctx, "staff");
  if (u) await log(ctx.db, "staff", u.username, u.role, "logout", null, ctx.ip);
  setCookie(ctx, COOKIE.staff, "", 0);
  return { ok: true };
});
var SEC = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin", "Cache-Control": "no-store" };
async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return {};
  const text = await req.text();
  if (text.length > 7e6) throw new HttpError(413, "Request too large");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
__name(readBody, "readBody");
var json = /* @__PURE__ */ __name((status, body) => Response.json(body, { status, headers: SEC }), "json");
async function handle(req, env, execCtx, extra) {
  const url = new URL(req.url);
  let db, ok = false;
  try {
    const r = routes.find((r2) => r2.method === req.method && r2.re.test(url.pathname));
    if (!r) throw new HttpError(404, "Not found");
    if (req.method !== "GET" && !/application\/json/.test(req.headers.get("content-type") || "")) throw new HttpError(415, "JSON required");
    const m = url.pathname.match(r.re);
    db = await openDb(env, execCtx);
    const ctx = {
      req,
      env,
      db,
      cookies: [],
      waitUntil: /* @__PURE__ */ __name((p) => execCtx.waitUntil(p), "waitUntil"),
      secure: url.protocol === "https:",
      ...extra,
      params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])),
      query: Object.fromEntries(url.searchParams),
      ip: req.headers.get("cf-connecting-ip") || "local",
      body: await readBody(req)
    };
    await guardCheck(r.guard, ctx);
    const out = await r.handler(ctx) ?? { ok: true };
    ok = true;
    await db.finish(true);
    const headers = new Headers(SEC);
    for (const c of ctx.cookies) headers.append("Set-Cookie", c);
    if (out.__raw) {
      for (const [k, v] of Object.entries(out.headers || {})) headers.set(k, v);
      return new Response(out.bytes || out.text, { headers });
    }
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(out), { headers });
  } catch (e) {
    if (db && !ok) execCtx.waitUntil(db.finish(false).catch(() => {
    }));
    if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra });
    console.error(e);
    return json(500, { error: "Something went wrong on our side" });
  } finally {
    if (db) db.close();
  }
}
__name(handle, "handle");

// src/portal.js
globalThis.location ??= { href: "https://elc.local/" };
var engineReady = null;
var initEngine = /* @__PURE__ */ __name(() => engineReady ||= (0, import_sql_wasm.default)({ instantiateWasm(imports, ok) {
  WebAssembly.instantiate(wasm, imports).then((i) => ok(i));
  return {};
} }).then(setEngine), "initEngine");
var CHUNK = 900 * 1024;
var Portal = class {
  static {
    __name(this, "Portal");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.writeLock = Promise.resolve();
    const st = state.storage;
    setBackend({
      async get() {
        const m = await st.get("meta");
        if (!m) return null;
        const parts = [];
        let len = 0;
        for (let i = 0; i < m.n; i++) {
          const p = await st.get("db" + i);
          if (!p) return null;
          parts.push(p);
          len += p.length;
        }
        const bytes = new Uint8Array(len);
        let o = 0;
        for (const p of parts) {
          bytes.set(p, o);
          o += p.length;
        }
        return { bytes, version: m.version, stamp: m.stamp, fetchedAt: m.fetchedAt, schema: m.schema };
      },
      async put(e, withBytes) {
        const old = await st.get("meta"), n = Math.ceil(e.bytes.length / CHUNK);
        const rec = { meta: { n, version: e.version, stamp: e.stamp, fetchedAt: e.fetchedAt, schema: e.schema } };
        if (withBytes || !old || old.n !== n) for (let i = 0; i < n; i++) rec["db" + i] = e.bytes.slice(i * CHUNK, (i + 1) * CHUNK);
        await st.put(rec);
        if (old && old.n > n) await st.delete(Array.from({ length: old.n - n }, (_, i) => "db" + (n + i)));
      }
    });
  }
  // login attempt limiter, kept in this object's storage so it survives the object sleeping
  async throttle(key2, max = 8, windowMs = 6e5) {
    const k = "thr:" + key2, now = Date.now();
    let r = await this.state.storage.get(k);
    if (!r || r.until < now) r = { n: 0, until: now + windowMs };
    if (r.n >= max) throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
    r.n++;
    await this.state.storage.put(k, r);
  }
  clearThrottle(key2) {
    return this.state.storage.delete("thr:" + key2);
  }
  async fetch(req) {
    await initEngine();
    const url = new URL(req.url);
    const execCtx = { waitUntil: /* @__PURE__ */ __name((p) => this.state.waitUntil(p), "waitUntil") };
    if (url.pathname === "/__refresh") {
      this.state.waitUntil(refreshNow(this.env).then((r) => console.log("keep-warm:", r)).catch((e) => console.error("keep-warm failed", e.message)));
      return new Response("ok");
    }
    const extra = { throttle: /* @__PURE__ */ __name((k, a, b) => this.throttle(k, a, b), "throttle"), clearThrottle: /* @__PURE__ */ __name((k) => this.clearThrottle(k), "clearThrottle") };
    if (req.method === "GET") return handle(req, this.env, execCtx, extra);
    const run = this.writeLock.then(() => handle(req, this.env, execCtx, extra));
    this.writeLock = run.then(() => {
    }, () => {
    });
    return run;
  }
};

// src/index.js
var stub = /* @__PURE__ */ __name((env) => env.PORTAL.get(env.PORTAL.idFromName("main"), { locationHint: "apac" }), "stub");
var index_default = {
  fetch(req, env) {
    if (!new URL(req.url).pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    return stub(env).fetch(req);
  },
  // every 5 minutes: keep the live copy fresh and pick up hand-edits in the sheet
  scheduled(event, env, ctx) {
    ctx.waitUntil(stub(env).fetch("https://portal.internal/__refresh", { method: "POST" }));
  }
};
export {
  Portal,
  index_default as default
};
//# sourceMappingURL=index.js.map
