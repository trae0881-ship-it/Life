const starCount = 28;

export default function CosmicAuthScene() {
  return <div className="auth-cosmos" aria-hidden="true">
    <div className="auth-cosmos-glow auth-cosmos-glow-one" />
    <div className="auth-cosmos-glow auth-cosmos-glow-two" />
    <div className="auth-orbit auth-orbit-one"><span /></div>
    <div className="auth-orbit auth-orbit-two"><span /></div>
    <div className="auth-orbit auth-orbit-three"><span /></div>
    <div className="auth-cosmos-core">✳</div>
    <div className="auth-cosmos-stars">
      {Array.from({ length: starCount }, (_, index) => <span
        className="auth-star"
        key={index}
        style={{
          left: `${(index * 37 + 11) % 100}%`,
          top: `${(index * 61 + 13) % 100}%`,
          opacity: 0.3 + (index % 4) * 0.12,
        }}
      />)}
    </div>
  </div>;
}
