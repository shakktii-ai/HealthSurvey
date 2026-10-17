import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Atomically increments and returns the next sequence number for a given key.
 * Guaranteed collision-free across concurrent processes.
 */
CounterSchema.statics.getNextSequence = async function (sequenceName) {
  const counter = await this.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export default Counter;
