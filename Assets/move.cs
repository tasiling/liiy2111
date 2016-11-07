using UnityEngine;
using System.Collections;

public class move : MonoBehaviour {


	public float speed;

	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {

		if (Input.GetKey (KeyCode.A)) {
			transform.Translate (-1 * speed, 0, 0);
		}
		if (Input.GetKey (KeyCode.D)) {
			transform.Translate (1 * speed, 0, 0);
		}
		if (Input.GetKey (KeyCode.W)) {
			transform.Translate (0, 0, 1 * speed);
		}
		if (Input.GetKey (KeyCode.S)) {
			transform.Translate (0, 0, -1 * speed);
		}

	}
}
