export function SkeletonCard() {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      <div className="label" style={{ height: "1rem", backgroundColor: "#333", borderRadius: "4px", width: "60%" }} />
      <div style={{ height: "2rem", backgroundColor: "#333", borderRadius: "4px", marginTop: "0.5rem", width: "80%" }} />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Order ID</th>
            <th>Queue age text</th>
            <th>Checked at</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, i) => (
            <tr key={i}>
              <td></td>
              <td style={{ height: "1rem", backgroundColor: "#333", borderRadius: "4px" }}></td>
              <td style={{ height: "1rem", backgroundColor: "#333", borderRadius: "4px" }}></td>
              <td style={{ height: "1rem", backgroundColor: "#333", borderRadius: "4px" }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
