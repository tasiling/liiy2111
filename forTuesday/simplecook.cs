using UnityEngine;
using System.Collections;
using UnityEngine.Networking;

public class simplecook : NetworkBehaviour {

	public GameObject getfood;
	[SyncVar]
	public int i;
	public static bool gotit;
	public GameObject Steak;
	public Rigidbody dish;
	// Use this for initialization
	void Start () {
		i = 0;
		gotit = false;
		dish = Steak.GetComponent<Rigidbody> ();

	}

	// Update is called once per frame
	void Update () {
		if (i == 3) {
			Steak.SetActive (true);
			dish.AddForce (new Vector3 (0, 200, 200));
			i++;
		}
	}
	void OnTriggerEnter(Collider other){
		if (other.CompareTag ("Player")) {
			if (move.havefood == true) {
				getfood=move.myfood;
				if (getfood == Steak) {
				} else {
					Destroy (getfood);
					gotit = true;
					i++;
				}
			}
		}
	}
}
